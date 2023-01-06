# 叠老虎

## 更新pb包命令

```
protoc --go_out=. packet/model.proto
protoc --js_out=library=protobuf,binary:static/js  packet/model.proto

//commonjs
npm i  google-protobuf
npm i  browserify
npm i minifier
protoc --js_out=import_style=commonjs,binary:.  packet/model.proto
cd packet
browserify msg_pb.js model_pb.js -o  pb_dist.js
minify pb_dist.js
```



```
go build

stacktiger.exe 
```

## 运行效果
打开浏览器，输入 http://127.0.0.1:8004/


![screenshot1](screenshot1.png)

