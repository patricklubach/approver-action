import * as core from '@actions/core'

class Config {
  constructor(config) {
    if (!config || typeof data !== 'object') {
      throw new Error('Invalid input: Expected an object.')
    }

    this.checkOn = config.check_on || 'branch_name'
    this.rules = config.rules

    this.validate()

    // The rule which matches
    this.condition = this.determineCondition()
  }

  validate() {
    if (
      !this.checkOn ||
      (this.checkOn !== 'branch_name' && this.checkOn !== 'title')
    ) {
      throw new Error(
        `Invalid check_on property. Use one of: 'branch_name', 'title'. Got: ${this.checkOn}`
      )
    }
    if (!Array.isArray(this.rules)) {
      throw new Error(
        `Invalid rules property. 'rules' property is either not defined or empty!`
      )
    }
  }

  determineCondition() {
    core.info(`Trying to find rule that matches "${checkOn}"`)
    for (const rule of data) {
      if (
        Object.prototype.hasOwnProperty.call(rule, 'regex') &&
        isMatchingPattern(checkOn, rule['regex'])
      ) {
        core.info(`Rule with regex "${rule.regex}" matches "${checkOn}"`)
        return rule
      }
    }
    core.warning(
      `No rule regex matches "${checkOn}". Trying to fallback to default rule`
    )
    for (const rule of data) {
      if (Object.prototype.hasOwnProperty.call(rule, 'default')) {
        core.info('Default rule found.')
        return rule
      }
    }
    throw new Error('No matching rule found.')
  }
}

class Rule {
  constructor(rule) {
    this.regex = rule.regex
    this.type = rule.type
    this.amount = rule.amount || null
    this.reviewers = rule.reviewers
    this.default = rule.default || false
  }
}
