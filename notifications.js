require('dotenv').load({silent: true})
const Slack = require('node-slack')
const Bottleneck = require('bottleneck')
const console = require('better-console')

// slack init
const {SLACK_WEBHOOK_URL, SLACK_WEBHOOK_URL_CEA_GENERAL} = process.env

const slackDefault = new Slack(SLACK_WEBHOOK_URL)
const slackCEAGeneral = new Slack(SLACK_WEBHOOK_URL_CEA_GENERAL)

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

async function send (message, channel) {
  const options = Object.assign({}, slackMessageDefaults, message)
  let slackInstance
  switch (channel) {
    case "#cea-only_general":
      slackInstance = slackCEAGeneral
      break
    default:
      slackInstance = slackDefault
  }
  await limiter.schedule(() => slackInstance.send(options))
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

async function teamFeedbackRequest (Records) {
  if (!Records || !Array.isArray(Records)) throw new Error(`variabele 'Records' is not an array`)
  if (!Records.length) return
  const text = []
  switch (Records.length) {
    case 1:
      text.push(`:bust_in_silhouette: *${Records[0].get('Name')}* has recently applied to work at CEA.`)
      break
    default:
      text.push(`The following people have recently applied to work at CEA:\n`)
      text.push(Records.map(Record => `:bust_in_silhouette: *${Record.get('Name')}*`).join('\n'))
  }
  // main message body
  text.push(
    [
      `\n\n`,
      `If you have information that might be relevant to hiring them, and you're happy to share it, `,
      `please provide it using the CEA Recruitment Team Feedback form here: `,
      `https://airtable.com/shrOnILyLdp0sDmdx`,
      `\n\n`,
      `_(You'll need to be signed into an Airtable account linked to an `,
      `\`@centreforeffectivealtruism.org\` email address)_`
    ].join('')
  )
  await send({
    text: text.join('')
  }, '#cea-only_general')
}

module.exports = {statusChanged, teamFeedbackRequest, sendError}
