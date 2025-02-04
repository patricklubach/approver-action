import { Reviewers } from './entities.js'

import * as core from '@actions/core'

class Rule {
  constructor(rule) {
    this.regex = rule.regex || null
    this.type = rule.type
    this.amount = rule.amount || null
    this.reviewers = new Reviewers(rule.reviewers)
    this.default = rule.default || false

    this.validate()
  }

  validate() {
    core.debug(`Validating rule type...`)
    if (this.type === 'AMOUNT' && !this.amount) {
      throw new Error(
        "When setting rule type to 'AMOUNT' rule.amount needs to be set!"
      )
    }
  }
}

export class Rules {
  constructor(rules) {
    this.rules = []
    this.init(rules)
  }

  init(rules) {
    this.rules = rules.map(rule => new Rule(rule))
  }

  getDefaultRule() {
    core.info('Getting default rule')
    const defaultRule = this.rules.find(rule => rule.default)

    if (defaultRule) {
      core.info('Default rule found')
      return defaultRule
    } else {
      throw new Error('No default rule found!')
    }
  }

  getMatchingRule(condition) {
    core.debug('Getting matching rule')
    try {
      for (const rule of this.rules) {
        if (!rule.regex) {
          core.debug(`Rule has no regex defined. Skipping...`)
          continue
        }
        // Ensure the pattern is a RegExp object if it's provided as a string
        if (typeof rule.regex === 'string') {
          var regex = new RegExp(rule.regex)
        } else {
          throw new Error(
            `Invalid regular expression. Regular expression is no string!`
          )
        }

        // Test the string against the regex pattern
        const isValid = regex.test(condition)
        core.debug(
          `Check that "${condition}" matches regex ${rule.regex} => ${isValid}`
        )
        if (isValid) {
          return rule
        }
      }
    } catch (error) {
      throw new Error(
        `Regular expression check failed. Details: ${error.message}`
      )
    }
    core.warning(
      `No rule matching pattern matches ${rule.type} "${condition}". Trying to fallback to default rule`
    )
    try {
      return this.getDefaultRule()
    } catch (error) {
      core.error(error.message)
      throw new Error(
        'No rule matches pattern and no default rule was defined!'
      )
    }
  }
}
