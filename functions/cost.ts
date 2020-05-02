import { ScheduledEvent, Context } from 'aws-lambda'
import { CostExplorer, STS } from 'aws-sdk'
import { GetCostAndUsageRequest } from 'aws-sdk/clients/costexplorer'
import * as DayJS from 'dayjs'
import axios from 'axios'

const url = process.env.HOOKS_URL
const channel = process.env.CHANNEL
const costExplorerLink = 'https://console.aws.amazon.com/cost-reports/home?#/custom?groupBy=Service&hasBlended=false&hasAmortized=false&excludeDiscounts=true&excludeTaggedResources=false&timeRangeOption=Last3Months&granularity=Monthly&reportName=&reportType=CostUsage&isTemplate=true&filter=%5B%5D&chartStyle=Group&forecastTimeRangeOption=None&usageAs=usageQuantity'

const dayjs = require('dayjs')
const date = dayjs()
const params = ({startDate, endDate}): GetCostAndUsageRequest =>  {
  return ({
  Granularity: 'MONTHLY',
  Metrics: [ 'UnblendedCost' ],
  GroupBy: [{
    Type: 'DIMENSION',
    Key: 'SERVICE',
  }],
  TimePeriod: {
    Start: startDate,
    End: endDate,
  },
})}

const sum = arr => arr.reduce((a, b) => a + b);
const total = (getCostAndUsageResponse) => {
  return sum(getCostAndUsageResponse.ResultsByTime[0].Groups.map(_ => Number(_.Metrics.UnblendedCost.Amount)))
}

function previousMonthPeriod(date: DayJS.Dayjs, num: number) {
  const previousMonth = date.subtract(num, 'month')
  const startDate = previousMonth.set('date', 1).format('YYYY-MM-DD')
  const endDate = previousMonth.endOf('month').format('YYYY-MM-DD')
  return {startDate, endDate}
}

export const cost = async function (
    event: ScheduledEvent,
    context: Context,
    _: never): Promise<void> {
  try {
    const costExplorer = new CostExplorer({region: 'us-east-1'})
    const lastMonth = await costExplorer.getCostAndUsage(params(previousMonthPeriod(date, 1))).promise()
    const monthBeforeLast = await costExplorer.getCostAndUsage(params(previousMonthPeriod(date, 2))).promise()
    const lastMonthTop = lastMonth.ResultsByTime[0].Groups.map(_ =>
      ({
        'service': _.Keys[0],
        'cost': Number(_.Metrics.UnblendedCost.Amount)
      })).sort((a , b) => b.cost - a.cost)
    const lastMonthTotal = total(lastMonth)
    const monthBeforeLastTotal = total(monthBeforeLast)
    const sts = new STS()
    const getCallerIdentityResponse = await sts.getCallerIdentity().promise()
    const account = getCallerIdentityResponse.Account
    const formatMessage = `:cloud: monthly and by service(top12) in AWS(\`${account}\`) \n` +
      ':calendar: '+
      `${date.subtract(1, 'month').format('YYYY-MM')}: \`$${Math.round(lastMonthTotal)}\`` +
      `(${date.subtract(2, 'month').format('YYYY-MM')}: \`$${Math.round(monthBeforeLastTotal)}\`)`
      const payload = {
        channel: channel,
        username: 'AWS Cost Report',
        icon_emoji: ':money_with_wings:',
        text: formatMessage,
        attachments: [{
          title: 'CostExplorer',
          title_link: costExplorerLink,
          fields: lastMonthTop.map((group) => ({
            title: group.service,
            value: '$' + Math.round(group.cost).toString(),
            short: true
          })).slice(0, 12)
        }],
      }
      // colon should be escaped
      const options = JSON.stringify(payload).replace(/':'/g, '\'\:\'')
      await axios.post(url!, options)
      return
  } catch (error) {
    console.error(error)
  }
}
