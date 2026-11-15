@echo off
rem Lab FourT - tat ban demo. Bam dup vao tep nay. Du lieu van duoc giu.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\demo\dung-demo.ps1" %*
if not defined LABFOURT_NO_PAUSE pause
