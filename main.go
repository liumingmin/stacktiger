package main

import (
	"context"
	"math"
	"math/rand"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/DeanThompson/ginpprof"
	"github.com/gin-gonic/gin"
	"github.com/golang/protobuf/proto"
	"github.com/liumingmin/goutils/log"
	"github.com/liumingmin/goutils/utils/safego"
	"github.com/liumingmin/goutils/ws"
	"github.com/liumingmin/stacktiger/constant"
	"github.com/liumingmin/stacktiger/packet"
)

var tigerRank sync.Map

func main() {
	e := gin.Default()
	e.Static("/static", "./static")
	e.GET("/join", JoinGame)
	e.GET("/rank", GameRank)

	ginpprof.WrapGroup(&e.RouterGroup)

	e.Run(":8004")
}

func JoinGame(ctx *gin.Context) {
	uid := ctx.Query("uid")
	if uid == "" {
		ctx.JSON(http.StatusOK, gin.H{"msg": "需要登录"})
		return
	}

	connMeta := ws.ConnectionMeta{
		UserId:   uid,
		Typed:    0,
		DeviceId: "",
		Version:  0,
		Charset:  0,
	}

	_, err := ws.AcceptGin(ctx, connMeta, ws.ConnectCbOption(&ConnectCb{connMeta.UserId}))
	if err != nil {
		log.Error(ctx, "Accept client connection failed. error: %v", err)
		return
	}
}

type ConnectCb struct {
	Uid string
}

type tigerScale struct {
	LastMts int64
	Rand    int64
	Done    chan struct{}
	Pause   chan struct{}
	Resume  chan struct{}

	CurrScale   int
	LastScale   int
	StackScales []int
}

func (c *ConnectCb) ConnFinished(clientId string) {
	connection, err := ws.Clients.Find(clientId)
	if err != nil {
		log.Error(context.Background(), "ConnFinished failed: %v", err)
		return
	}

	doneCh := make(chan struct{}, 1)
	pauseCh := make(chan struct{}, 1)
	resumeCh := make(chan struct{}, 1)

	params := &tigerScale{
		LastMts: mts(),
		Rand:    int64(randInt()),
		Done:    doneCh,
		Pause:   pauseCh,
		Resume:  resumeCh,
	}
	connection.SetCommDataValue(constant.CONN_PARAMS, params)

	safego.Go(func() {
		ticker := time.NewTicker(time.Millisecond * 250)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				scale := math.Abs(math.Sin(float64(mts()-params.LastMts)/600))*2.8 + 0.2
				data := &packet.SCALING{Scale: float32(scale)}
				packet := ws.GetPMessage()
				packet.ProtocolId = constant.WS_S2C_SCALING
				packet.Data, _ = proto.Marshal(data)
				connection.SendMsg(context.Background(), packet, nil)

				params.CurrScale = int(scale * 10)
			case <-doneCh:
				return
			case <-pauseCh:
				if (mts() - params.LastMts) < 300 {
					continue
				}
				ticker.Stop()
				dropTiger(connection)

				select {
				case <-resumeCh:
					params.LastMts = mts()
					ticker.Reset(time.Millisecond * 250)
				}
			}
		}
	})
}

func mts() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

func randInt() int {
	rand.Seed(time.Now().UnixNano())
	randN := rand.Intn(100)
	if randN == 0 {
		randN = 10
	}
	return randN
}

func (c *ConnectCb) DisconnFinished(clientId string) {
	connection, err := ws.Clients.Find(clientId)
	if err != nil {
		log.Error(context.Background(), "ConnFinished failed: %v", err)
		return
	}
	obj, ok := connection.GetCommDataValue(constant.CONN_PARAMS)
	if !ok {
		return
	}

	scale := obj.(*tigerScale)
	select {
	case scale.Done <- struct{}{}:
	default:
	}
}

func DropTiger(ctx context.Context, connection *ws.Connection, msg *ws.P_MESSAGE) error {
	log.Info(ctx, "recv drop msg")

	obj, ok := connection.GetCommDataValue(constant.CONN_PARAMS)
	if !ok {
		return nil
	}

	scale := obj.(*tigerScale)
	select {
	case scale.Pause <- struct{}{}:
	default:
	}

	return nil
}

func ResumeTiger(ctx context.Context, connection *ws.Connection, msg *ws.P_MESSAGE) error {
	log.Info(ctx, "recv resume msg")

	obj, ok := connection.GetCommDataValue(constant.CONN_PARAMS)
	if !ok {
		return nil
	}

	scale := obj.(*tigerScale)
	select {
	case scale.Resume <- struct{}{}:
	default:
	}

	return nil
}

func dropTiger(connection *ws.Connection) {
	obj, ok := connection.GetCommDataValue(constant.CONN_PARAMS)
	if !ok {
		return
	}

	success := int32(0)

	scale := obj.(*tigerScale)
	if scale.LastScale == 0 || scale.LastScale >= scale.CurrScale {
		scale.LastScale = scale.CurrScale
		scale.StackScales = append(scale.StackScales, scale.CurrScale)
		success = 1
	} else { //failed
		select {
		case scale.Done <- struct{}{}:
		default:
		}

		tigerRank.Store(connection.UserId(), len(scale.StackScales))
	}

	data := &packet.STACK_STATUS{Status: success, Count: int32(len(scale.StackScales))}
	packet := ws.GetPMessage()
	packet.ProtocolId = constant.WS_S2C_DROP_TIGER
	packet.Data, _ = proto.Marshal(data)
	connection.SendMsg(context.Background(), packet, nil)
}

type PlayerScore struct {
	Uid   string `json:"uid"`
	Score int    `json:"score"`
}

func GameRank(ctx *gin.Context) {
	playerScores := make([]*PlayerScore, 0)
	tigerRank.Range(func(key, value interface{}) bool {
		playerScores = append(playerScores, &PlayerScore{
			Uid:   key.(string),
			Score: value.(int),
		})
		return true
	})
	sort.Slice(playerScores, func(i, j int) bool {
		return playerScores[i].Score > playerScores[j].Score
	})
	ctx.JSON(http.StatusOK, gin.H{"code": 0, "data": playerScores})
}

func init() {
	ws.RegisterHandler(constant.WS_C2S_DROP, DropTiger)
	ws.RegisterHandler(constant.WS_C2S_RESUME, ResumeTiger)
}
