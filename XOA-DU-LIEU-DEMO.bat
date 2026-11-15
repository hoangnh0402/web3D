@echo off
rem Lab FourT - xoa sach du lieu demo de quay lai tu dau. Bam dup vao tep nay.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\demo\dung-demo.ps1" -XoaDuLieu %*
if not defined LABFOURT_NO_PAUSE pause
