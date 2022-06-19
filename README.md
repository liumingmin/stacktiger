# 叠老虎

## 更新pb包命令

```
protoc --go_out=. packet/model.proto
protoc --js_out=library=protobuf,binary:static/js  packet/model.proto
```



```
go build

stacktiger.exe 
```

## 运行效果
打开浏览器，输入 http://127.0.0.1:8004/
![screenshot1](screenshot1.png)

