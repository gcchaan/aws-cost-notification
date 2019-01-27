### What this

AWS Slack notification on monthly cost using Slack web-hooks
this bot will report total cost and cost by service

### Install

- clone this repo.
- run `npm(or yarn) install`.

### Deploy

```
export CHANNEL='#hoge'
export HOOKS_URL='https://hooks.slack.com/services/XXXX/YYYY/ZZZZ'
npx sls deploy
```

### Reference

- API: [GetCostAndUsage](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html)
