import * as core from '@actions/core'

class Check {
  constructor() {}

  isFulfilled(rule, reviews, reviewers) {
    core.info(`Check if rule is fulfilled...`)
    core.debug(`Rule type is '${rule.type}'`)
    switch (rule.type) {
      case 'ALL':
        core.debug(`Rule type is 'ALL'`)
        for (const reviewer of reviewers) {
          core.debug(`Validating reviewer: ${reviewer.name}`)
          const validated = reviews.some(
            review => review.user.login === reviewer.name
          )
          if (!validated) {
            return False
          }
        }
        return true
      case 'AMOUNT':
        core.debug(`Rule type is 'AMOUNT'`)
        const approvalCounter = 0
        for (const reviewer of reviewers) {
          core.debug(`Validating reviewer: ${reviewer.name}`)
          const validated = reviews.some(
            review => review.user.login === reviewer.name
          )
          if (validated) {
            approvalCounter++
          }
        }
        return approvalCounter >= rule.amount
      case 'ONE_OF_EACH':
        core.debug(`Rule type is 'ONE_OF_EACH'`)
        for (const review of reviews) {
          const name = review.user.login
          core.debug(`Validating reviewer: ${name}`)
          // Search desired reviewers if matches pr reviewer
          // user reviewers take prcedence over team members
          for (const reviewer of reviewers) {
            if (reviewer.type === 'user') {
              if (name === reviewer.login && !reviewer.checked) {
                reviewer.checked = true
                break
              }
            }
          }
          // when reviewer is not found in defined users. Search for reviewer in teams
          for (const reviewer of reviewers) {
            if (reviewer.type === 'team') {
              if (reviewer.isMember(name) && !reviewer.checked) {
                reviewer.checked = true
              }
            }
          }
          // check if all reviewers are checked
          for (const reviewer of reviewers) {
            if (!reviewer.checked) {
              return false
            }
          }
        }
        return true
      default:
        return false
    }
  }
}

export const check = new Check()
