@echo off
cd /d "%~dp0"
echo 正在启动本地图片水印工具 (端口 3000, 监听所有网卡)...
echo 本机访问:   http://127.0.0.1:3000/local-imgs-watermark/
echo 局域网访问: http://%COMPUTERNAME%:3000/local-imgs-watermark/
call npm run dev -- --port 3000 --host 0.0.0.0
pause
