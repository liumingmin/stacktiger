
// You can write more code here

/* START OF COMPILED CODE */

class Level extends Phaser.Scene {

	constructor() {
		super("Level");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// score
		const score = this.add.text(53, 50, "", {});
		score.setOrigin(0.5, 0.5);
		score.text = "0";
		score.setStyle({ "fontFamily": "Arial", "fontSize": "30px" });

		// rectangle
		const rectangle = this.add.rectangle(580, 572, 800, 50);
		rectangle.scaleX = 1.8735486766353273;
		rectangle.scaleY = 1.303620102747287;
		rectangle.isFilled = true;
		rectangle.fillColor = 9472136;
		rectangle.strokeColor = 11573657;

		// score (components)
		new FixedToCamera(score);

		// rectangle (components)
		const rectanglePhysics = new Physics(rectangle);
		rectanglePhysics.bodyGravity = 1;
		rectanglePhysics.isStatic = true;
		new PhysicsBody(rectangle);

		this.score = score;
		this.rectangle = rectangle;

		this.events.emit("scene-awake");
	}

	/** @type {Phaser.GameObjects.Text} */
	score;
	/** @type {Phaser.GameObjects.Rectangle} */
	rectangle;

	/* START-USER-CODE */

	// Write more your code here

	preload() { 
        this.load.scenePlugin({
            key: 'rexuiplugin',
            url: '/static/game/src/plugins/rexuiplugin.min.js',
            sceneKey: 'rexUI'
        });
    }

	openRank() {
		const COLOR_PRIMARY = 0x4e342e;
		const COLOR_LIGHT = 0x7b5e57;
		const COLOR_DARK = 0x260e04;

        var scrollMode = 0; // 0:vertical, 1:horizontal
        this.gridTable = this.rexUI.add.gridTable({
			x: 400,
            y: 300,
            width: 300,
            height: 420,

            scrollMode: 0,

            background: this.rexUI.add.roundRectangle(0, 0, 20, 10, 10, COLOR_PRIMARY),

            table: {
                cellWidth: undefined,
                cellHeight: 30,

                columns: 1,

                mask: {
                    padding: 2,
                },

                reuseCellContainer: true,
            },

            header: this.createRowItem(this,
                {
                    background: this.rexUI.add.roundRectangle(0, 0, 20, 20, 0, COLOR_DARK),
                    id: this.add.text(0, 0, '玩家'),
                    score: this.add.text(0, 0, '分数'),
                    height: 30
                }
            ),

            space: {
                left: 20,
                right: 20,
                top: 20,
                bottom: 20,

                table: 10,
                header: 10,
                footer: 10,
            },
			createCellContainerCallback:  (cell, cellContainer) =>{
                var scene = cell.scene,
                    width = cell.width,
                    height = cell.height,
                    item = cell.item,
                    index = cell.index;
                if (cellContainer === null) {
                    cellContainer = this.createRowItem(scene);
                    //console.log(cell.index + ': create new cell-container');
                } else {
                   // console.log(cell.index + ': reuse cell-container');
                }

                // Set properties from item value
                cellContainer.setMinSize(width, height); // Size might changed in this demo
                cellContainer.getElement('id').setText(item.uid);
                cellContainer.getElement('score').setText(item.score);
                return cellContainer;
            },
			items: []
		}).layout();

		new FixedToCamera(this.gridTable);
		this.createRankItems();
	}

	createRowItem (scene, config) {
		const COLOR_DARK = 0x260e04;
		
		const GetValue = Phaser.Utils.Objects.GetValue;
		var background = GetValue(config, 'background', undefined);
		if (background === undefined) {
			background = scene.rexUI.add.roundRectangle(0, 0, 20, 20, 0).setStrokeStyle(2, COLOR_DARK)
		}
		var id = GetValue(config, 'id', undefined);
		if (id === undefined) {
			id = scene.add.text(0, 0, id);
		}
		var score = GetValue(config, 'score', undefined);
		if (score === undefined) {
			score = scene.add.text(0, 0, score);
		}
		return scene.rexUI.add.sizer({
			width: GetValue(config, 'width', undefined),
			height: GetValue(config, 'height', undefined),
			orientation: 'x',
		})
			.addBackground(
				background
			)
			.add(
				id,    // child
				0,                           // proportion, fixed width
				'center',                    // align vertically
				{ left: 10 },                // padding
				false,                       // expand vertically
				'id'                         // map-key
			)
			.addSpace()
			.add(
				score, // child
				0,                           // proportion, fixed width
				'center',                    // align vertically
				{ right: 10 },               // padding
				false,                       // expand vertically
				'score'                      // map-key
			)
	}

	createRankItems(){
		const url = "http://"+hostAddress+"/rank";

		$.get(url, {}, (result)=> {
			if (result.code == 0 && result.data) {
				this.gridTable.setItems(result.data);
			}
		});
	}

	gridTable;

	tiger;
	tigers;
	success;
	create() {
		this.editorCreate();

		this.tigers =[];
		this.tiger = this.createTiger();

		this.initEnv();
		this.initWs();
		//this.openRank();
	}


	initEnv() {
		this.rectangle.y = this.game.config.height;
		//this.physics.add.collider(this.tiger, this.rectangle);
	}

	initWs(){
		this.ws = new WsConnection();
        this.ws.registerMsgHandler(WS_S2C_SCALING, (ws, data) => {
            let scaling = proto.packet.SCALING.deserializeBinary(data);
            //console.log(scaling.getScale());

            this.tiger.scene.add.tween({
                targets: [this.tiger],
                scaleX: scaling.getScale(),
                yoyo: false,
                duration: 250,
                ease: 'Linear' //'Sine.easeInOut'
            });
        });

        this.ws.registerMsgHandler(WS_S2C_DROP_TIGER, (ws, data) => {
            let stackStatus = proto.packet.STACK_STATUS.deserializeBinary(data);
            this.score.text =  stackStatus.getCount()+"";
            this.success = stackStatus.getStatus();

            if(this.success==0){
                this.openRank();
            }
            this.dropTiger();
        });
        this.ws.connect("ws://"+hostAddress+"/join?uid="+window.localStorage["username"]);
	}

	updateCam() {
		const tigerHeight = 159; //0.5*250 
		const cam = this.cameras.main;
		//console.log(this.tiger.y);
		cam.scrollY = this.tiger.y - tigerHeight/2; //this.tiger.bodyY+this.bodyHeight/2;
	}

	resumeScale(){
		this.ws.sendMsg(WS_C2S_RESUME,"");
	}

	createTiger(){
		if(this.success == 0){
			return null;
		}

		const tigerHeight = 159; //0.5*250 
		const height = this.game.config.height;
		let dropedHeight = this.tigers.length * tigerHeight;
		let newTigerHeight =  dropedHeight + height/3+ tigerHeight/2; //始终保持老虎之间有height/3高度
		let newTigerY = tigerHeight/2; // init
		if(newTigerHeight>height){
			newTigerY = height - newTigerHeight;
		}

		const tiger = this.add.image(this.game.config.width/2, newTigerY, "tiger");
		//tiger.scaleX = 0.5;
		//tiger.scaleY = 0.5;

		const phy = new Physics(tiger);
		new PhysicsBody(tiger);


		//
		const pushOnClick = new PushOnClick(tiger);

		this.physics.add.collider(tiger, this.rectangle,()=>{
			if(this.tigers.indexOf(tiger)>=0){
				return ;
			}
			Physics.getComponent(tiger).setGravityY(0);
			tiger.body.immovable = true;

			this.tigers.push(tiger);
			this.tiger = this.createTiger();
			if (this.tiger==null){
				return ;
			}
			this.resumeScale();
		});

		this.physics.add.collider(tiger, this.tigers[this.tigers.length-1],(obj1,obj2)=>{
			if(this.tigers.indexOf(tiger)>=0){
				return ;
			}
			Physics.getComponent(tiger).setGravityY(0);
			tiger.body.immovable = true;

			this.tigers.push(tiger);
			this.tiger = this.createTiger();
			if (this.tiger==null){
				return ;
			}
			this.resumeScale();
			this.updateCam()
		});

		phy.start();
		pushOnClick.awake();
		return tiger;
	}

	dropTiger(){
		Physics.getComponent(this.tiger).setGravityY(300);
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
