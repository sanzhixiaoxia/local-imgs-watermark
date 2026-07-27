@echo off
cd /d "%~dp0"
echo 正在启动本地图片水印工具 (HTTPS, 端口 3000, 监听所有网卡)...
echo 本机访问:   https://127.0.0.1:3000/local-imgs-watermark/
echo 局域网访问: https://%COMPUTERNAME%:3000/local-imgs-watermark/
echo 注意: 自签名证书浏览器会提示“不安全”，点击“高级”->“继续访问”即可
call npm run dev
pause
