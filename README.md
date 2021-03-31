# 双向证书测试

##### 统一使用密码：78324*&HE@lk

### 1，安装openssl

```
yum install openssl -y
```

修改OpenSSL配置

```
find / -name openssl.cnf

/etc/pki/tls/openssl.cnf

vim /etc/pki/tls/openssl.cnf

 54 ####################################################################
 55 [ ca ]
 56 default_ca      = CA_default            # The default ca section
 57 
 58 ####################################################################
 59 [ CA_default ]
 60 
 61 dir             = /root/nginx           # Where everything is kept
 62 certs           = $dir/certs            # Where the issued certs are kept
 63 crl_dir         = $dir/crl              # Where the issued crl are kept
 64 database        = $dir/index.txt        # database index file.

修改dir 为你的工作路径 我这里是/root/nginx 

cd /root/nginx
mkdir certs
mkdir newcerts
mkdir private
touch index.txt
echo 01 > serial

```

certs——存放已颁发的证书

newcerts——存放CA指令生成的新证书

private——存放私钥

crl——存放已吊销的证书

index.txt——OpenSSL定义的已签发证书的文本数据库文件，这个文件通常在初始化的时候是空的

serial——证书签发时使用的序列号参考文件，该文件的序列号是以16进制格式进行存放的，该文件必须提供并且包含一个有效的序列号

生成证书之前，需要先生成一个随机数：

```
openssl rand -out private/.rand 1000
```

该命令含义如下：

rand——生成随机数

-out——指定输出文件

1000——指定随机数长度

### 2，**生成根证书**

**a).生成根证书私钥(pem文件)**

OpenSSL通常使用PEM（Privacy Enbanced Mail）格式来保存私钥，构建私钥的命令如下：

```
openssl genrsa -aes256 -out private/cakey.pem 1024
```

该命含义如下：

genrsa——使用RSA算法产生私钥

-aes256——使用256位密钥的AES算法对私钥进行加密

-out——输出文件的路径

1024——指定私钥长度

**b).生成根证书签发申请文件(csr文件)**

使用上一步生成的私钥(pem文件)，生成证书请求文件(csr文件)：

```
openssl req -new -key private/cakey.pem -out private/ca.csr -subj \
"/C=CN/ST=BJ/L=BJ/O=ZLEX/OU=zlex/CN=*.ZLEX.ORG"
```

req——执行证书签发命令

-new——新证书签发请求

-key——指定私钥路径

-out——输出的csr文件的路径

-subj——证书相关的用户信息(subject的缩写)

**c).自签发根证书(cer文件)**

csr文件生成以后，可以将其发送给CA认证机构进行签发，当然，这里我们使用OpenSSL对该证书进行自签发：

```
openssl x509 -req -days 365 -sha1 -extensions v3_ca -signkey \
private/cakey.pem -in private/ca.csr -out certs/ca.cer
```

该命令的含义如下：

x509——生成x509格式证书

-req——输入csr文件

-days——证书的有效期（天）

-sha1——证书摘要采用sha1算法

-extensions——按照openssl.cnf文件中配置的v3_ca项添加扩展

-signkey——签发证书的私钥

-in——要输入的csr文件

-out——输出的cer证书文件

## **用根证书签发server端证书**

和生成根证书的步骤类似，这里就不再介绍相同的参数了。

**a).生成服务端私钥**

```
openssl genrsa -aes256 -out private/server-key.pem 1024
```

**b).生成证书请求文件**

```
openssl req -new -key private/server-key.pem -out private/server.csr -subj \
"/C=CN/ST=BJ/L=BJ/O=zlex/OU=zlex/CN=localhost"
```

**c).使用根证书签发服务端证书**

```
openssl x509 -req -days 365 -sha1 -extensions v3_req -CA certs/ca.cer -CAkey private/cakey.pem -CAserial ca.srl -CAcreateserial -in private/server.csr -out certs/server.cer
```

这里有必要解释一下这几个参数：

-CA——指定CA证书的路径

-CAkey——指定CA证书的私钥路径

-CAserial——指定证书序列号文件的路径

-CAcreateserial——表示创建证书序列号文件(即上方提到的serial文件)，创建的序列号文件默认名称为-CA，指定的证书名称后加上.srl后缀

注意：这里指定的-extensions的值为v3_req，在OpenSSL的配置中，v3_req配置的basicConstraints的值为CA:FALSE，如图：

而前面生成根证书时，使用的-extensions值为v3_ca，v3_ca中指定的basicConstraints的值为CA:TRUE，表示该证书是颁发给CA机构的证书，如图：

在x509指令中，有多种方式可以指定一个将要生成证书的序列号，可以使用set_serial选项来直接指定证书的序列号，也可以使用-CAserial选项来指定一个包含序列号的文件。所谓的序列号是一个包含一个十六进制正整数的文件，在默认情况下，该文件的名称为输入的证书名称加上.srl后缀，比如输入的证书文件为ca.cer，那么指令会试图从ca.srl文件中获取序列号，可以自己创建一个ca.srl文件，也可以通过-CAcreateserial选项来生成一个序列号文件。

## **用根证书签发client端证书**

和签发server端的证书的过程类似，只是稍微改下参数而已。

**a).生成客户端私钥**

```
openssl genrsa -aes256 -out private/client-key.pem 1024
```

**b).生成证书请求文件**

```
openssl req -new -key private/client-key.pem -out private/client.csr -subj \
"/C=CN/ST=BJ/L=BJ/O=zlex/OU=zlex/CN=zlex"
```

**c).使用根证书签发客户端证书**

```
openssl x509 -req -days 365 -sha1 -extensions v3_req -CA certs/ca.cer -CAkey private/cakey.pem \
-CAserial ca.srl -in private/client.csr -out certs/client.cer
```

需要注意的是，上方签发服务端证书时已经使用-CAcreateserial生成过ca.srl文件，因此这里不需要带上这个参数了。

 

至此，我们已经使用OpenSSL自签发了一个CA证书ca.cer，并用这个CA证书签发了server.cer和client.cer两个子证书了：

![img](http://static.oschina.net/uploads/space/2016/0401/153323_S39o_1434710.png)



## **导出证书**

**a).导出客户端证书**

```
openssl pkcs12 -export -clcerts -name myclient -inkey \
private/client-key.pem -in certs/client.cer -out certs/client.keystore
```

参数含义如下：

pkcs12——用来处理pkcs#12格式的证书

-export——执行的是导出操作

-clcerts——导出的是客户端证书，-cacerts则表示导出的是ca证书

-name——导出的证书别名

-inkey——证书的私钥路径

-in——要导出的证书的路径

-out——输出的密钥库文件的路径

**b).导出服务端证书**

```
openssl pkcs12 -export -clcerts -name myserver -inkey \
private/server-key.pem -in certs/server.cer -out certs/server.keystore
```

**c).信任证书的导出**

```
keytool -importcert -trustcacerts -alias localhost \
-file certs/ca.cer -keystore certs/ca-trust.keystore
```

### 验证双向认证

客户端

```
var tls = require('tls');
var fs = require('fs');

var options = {
    // These are necessary only if using the client certificate authentication
    key: fs.readFileSync('./nginx/private/client-key.pem'),
    cert: fs.readFileSync('./nginx/certs/client.cer'),
    passphrase: '78324*&HE@lk',
    rejectUnauthorized: true,
    // This is necessary only if the server uses the self-signed certificate
    ca: [ fs.readFileSync('./nginx/certs/ca.cer') ]
};

var cleartextStream = tls.connect(8000, 'localhost', options, function() {
    console.log('client connected', cleartextStream.authorized ? 'authorized' : 'unauthorized');
    cleartextStream.setEncoding('utf8');
    if(!cleartextStream.authorized){
        console.log('cert auth error: ', cleartextStream.authorizationError);
    }
    //    console.log(cleartextStream.getPeerCertificate());
});
cleartextStream.setEncoding('utf8');
cleartextStream.on('data', function(data) {
    console.log(data);
    // cleartextStream.write('Hello,this message is come from client!');
    cleartextStream.end();
});
cleartextStream.on('end', function() {
    console.log('disconnected');
});
cleartextStream.on('error', function(exception) {
    console.log(exception);
});
```

服务端

```
var tls = require('tls');
var fs = require('fs');

var options = {
    key: fs.readFileSync('./nginx/private/server-key.pem'),
    cert: fs.readFileSync('./nginx/certs/server.cer'),

    // This is necessary only if using the client certificate authentication.
    requestCert: true,
    passphrase: '78324*&HE@lk',
    rejectUnauthorized: true,
    // This is necessary only if the client uses the self-signed certificate.
    ca: [ fs.readFileSync('./nginx/certs/ca.cer') ]
};

var server = tls.createServer(options, function(cleartextStream) {
    console.log('server connected', cleartextStream.authorized ? 'authorized' : 'unauthorized');
    cleartextStream.write('this message is come from server!');
    cleartextStream.setEncoding('utf8');
    cleartextStream.pipe(cleartextStream);
    cleartextStream.on('data', function(data) {
        console.log(data);
    });
});
server.listen(8000, function() {
    console.log('server bound');
});
```

先启动服务端，再启动客户端

```
服务端输出：
D:\nodejs>node server.js
server bound
server connected authorized
Hello,this message is come from client!
server connected authorized
客户端输出：
D:\nodejs>node client.js
client connected authorized
this message is come from server!
disconnected
```

### TODO：nginx 转发双向认证配置

