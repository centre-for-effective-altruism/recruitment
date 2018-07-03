require('dotenv').load({silent: true})
const {AIRTABLE_API_KEY, AIRTABLE_BASE_ID} = process.env
const console = require('better-console')
const Airtable = require('airtable')
const Notifications = require('./notifications')
// airtable config
Airtable.configure({
    apiKey: AIRTABLE_API_KEY
})
const base = Airtable.base(AIRTABLE_BASE_ID);

const OUTREACH_TABLE_NAME = 'Outreach'

;(async () => {
  try {
    console.info('Running Outreach')
    console.info('================')
    console.info('Getting records')
    const Records = await getRecordsNotificationNotSent()
    if (!Records.length) {
      console.info(`No records to update!`)
      return
    }
    console.info(`Notifying responsible people`)
    for (let Record of Records) {
      try {
        if (
          Record.get('Suggested Contact Person') &&
          Record.get('Suggested Contact Person') !== Record.get('Responsible Person')
        ) {
          // send the notification
          await Notifications.outreachSuggestedPerson(Record)
        }
        // if the notification(s) sent OK, change the status
        await markNotificationSent(Record)
        console.info(`Notification sent for ${Record.get('Potential Candidate Name')}`)
      } catch (err) {
        console.warn(err.message)
        Notifications.sendError(err)
      }
    }
  } catch (err) {
    console.error(err)
  }
})()


async function getRecordsNotificationNotSent () {
  let Records = []
  // get all records where there is an unsynced status change
  // i.e. all where the `Stage` field is different to the `Previous Stage` field
  await base(OUTREACH_TABLE_NAME).select({
    filterByFormula: `NOT({Notification Sent})`
  }).eachPage(async (PageRecords, fetchNextPage) => {
    Records = Records.concat(PageRecords)
    await fetchNextPage()
  })
  return Records
}

async function markNotificationSent (Record) {
  const recordId = Record.id
  await base(OUTREACH_TABLE_NAME).update(recordId, {
    "Notification Sent": true
  })
}
