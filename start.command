#!/bin/sh
cd "$(dirname "$0")" || exit 1
printf '%s\n' 'Лендинг доступен по адресу http://localhost:8080/'
python3 -m http.server 8080
