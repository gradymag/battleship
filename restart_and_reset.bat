@echo off
echo Resetting the database...

REM Run the Heroku command to reset the database
heroku run node server/resetDatabse.js --app battleship-demo

REM Check if the Heroku command succeeded
if %ERRORLEVEL% NEQ 0 (
    echo Database reset failed. Exiting...
    pause
    exit /b
)

echo Restarting dynos...

REM Restart Heroku dynos
heroku ps:restart --app battleship-demo

REM Check if the Heroku command succeeded
if %ERRORLEVEL% NEQ 0 (
    echo Dyno restart failed. Exiting...
    pause
    exit /b
)

echo All tasks completed successfully!
pause
