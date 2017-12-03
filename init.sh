#!/bin/bash

git init
git commit -m 'root' --allow-empty
git create ianwremmel.com
git push -u origin master:master
curl https://circleci.com/api/v1.1/project/github/ianwremmel/ianwremmel.com/follow \
   -ns \
   -X POST
curl https://circleci.com/api/v1.1/project/github/ianwremmel/ianwremmel.com/settings \
  -ns \
  -X PUT \
  --data '{"feature_flags":{"autocancel-builds":true,"build-fork-prs":true,"forks-receive-secret-env-vars":false}}'
curl https://api.github.com/repos/ianwremmel/infrastructure/branches/master/protection\
  -ns
  -X PUT \
  --data '{"enforce_admins":true,"required_pull_request_reviews":null,"required_status_checks":{"contexts":["ci/circleci: plan"],"strict":true},"restrictions":null}'
