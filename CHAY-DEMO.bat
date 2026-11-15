@echo off
rem Lab FourT - chay ban demo. Bam dup vao tep nay.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\demo\chay-demo.ps1"
if not defined LABFOURT_NO_PAUSE pause
