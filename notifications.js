require('dotenv').load({silent: true})
const Slack = require('node-slack')
const Bottleneck = require('bottleneck')
const console = require('better-console')

const {SLACK_WEBHOOK_URL} = process.env
const slack = new Slack(SLACK_WEBHOOK_URL)

const AIRTABLE_LOGO_URL = 'https://support.airtable.com/hc/article_attachments/360001025028/airtable_logo_256.png'

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 333
})

const slackMessageDefaults = {
  username: 'CEA Recruitment AirTable',
  icon_emoji: AIRTABLE_LOGO_URL,
  link_names: 1,
  unfurl_links: false
}

async function send (message) {
  const options = Object.assign({}, slackMessageDefaults, message)
  await limiter.schedule (() => slack.send(options))
}

async function sendError (err) {
  try {
    await send({
      text: err.message,
      icon_emoji: ':fire:'
    })
  } catch (err2) {
    console.error('Could not notify of error')
    console.error('Initial Error:')
    console.error(err)
    console.error('Notification Error:')
    console.error(err2)
  }
}

async function statusChanged (Record) {
  if (!Record.get('Responsible Person Slack Handle')) {
    throw new Error(`No responsible person set for ${Record.get('Name')}`)
  }
  const text = (`
:bust_in_silhouette: *${Record.get('Name')}*'s application has progressed to the *${Record.get('Stage')}* stage.

This requires action from: ${Record.get('Responsible Person Slack Handle')}

_Roles under consideration: ${Record.get('Positions Under Consideration Names')}_

View/edit their application here: https://airtable.com/tbl36097FfhrqQj26/viwMFmNyBudCb3h07/${Record.id}
    `).trim()

  await send({
    text
  })
}


module.exports = {statusChanged, sendError}
