Set shell = CreateObject("WScript.Shell")
command = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & shell.ExpandEnvironmentStrings("%LOCALAPPDATA%\NOVA\start-nova.ps1") & """"
shell.Run command, 0, False
