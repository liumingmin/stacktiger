叠老虎

更新pb包命令
protoc --go_out=. packet/model.proto
protoc --js_out=library=protobuf,binary:static/js  packet/model.proto

go build


