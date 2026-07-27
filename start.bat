@echo off
cd /d "%~dp0"
echo 正在启动本地图片水印工具 (端口 3000)...
echo 访问地址: http://127.0.0.1:3000/local-imgs-watermark/
call npm run dev -- --port 3000 --host 127.0.0.1
pause
