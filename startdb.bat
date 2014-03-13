@echo off

set MongoPath=d:/utils/mongodb/bin
set TargetDB=d:/utils/nodejs/servers/fbecs-v0-03/data

rem Start Mongo 
%MongoPath%/mongod --dbpath %TargetDB%

rem end
