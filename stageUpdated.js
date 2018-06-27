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

const APPLICANTS_TABLE_NAME = 'Applicants'

;(async () => {
  try {
    console.info('Getting records')
    const ChangedRecords = await getRecordsWithStageChange()
    if (!ChangedRecords.length) {
      console.info(`No records to update!`)
      return
    }
    console.info(`Notifying of updates`)
    for (let Record of ChangedRecords) {
      try {
        await Notifications.statusChanged(Record)
        await syncRecordPreviousStage(Record)
        console.info(`Notification sent for ${Record.get('Name')}`)
      } catch (err) {
        console.warn(err.message)
        Notifications.sendError(err)
      }
    }
  } catch (err) {
    console.error(err)
  }
})()


async function getRecordsWithStageChange () {
  let Records = []
  // get all records where there is an unsynced status change
  // i.e. all where the `Stage` field is different to the `Previous Stage` field
  await base(APPLICANTS_TABLE_NAME).select({
    fields: [
      'Name',
      'Stage',
      'Previous Stage',
      'Responsible Person Slack Handle',
      'Positions Under Consideration Names'
    ],
    filterByFormula: `NOT({Stage} = {Previous Stage})`
  }).eachPage(async (PageRecords, fetchNextPage) => {
    Records = Records.concat(PageRecords)
    await fetchNextPage()
  })
  return Records
}

async function syncRecordPreviousStage (Record) {
  const currentStage = Record.get('Stage')
  const recordId = Record.id
  await base(APPLICANTS_TABLE_NAME).update(recordId, {
    "Previous Stage": currentStage
  })
}
