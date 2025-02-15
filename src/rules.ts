import { Reviewers } from './entities.js'

import * as core from '@actions/core'

/**
 * Manages and validates rules for review system operations.
 *
 * @class Rules
 */

export class Rule {
  /**
   * Constructs a new rule object with specified properties.
   *
   * @param {Object} rule - The rule object containing configuration properties
   * @returns {Rule} An instance of the Rule class
   */
  constructor(rule) {
    this.regex = rule.regex || null
    this.type = rule.type
    this.amount = rule.amount || null
    this.reviewers = new Reviewers(rule.reviewers)
    this.default = rule.default || false

    this.validate()
  }

  /**
   * Validates that the rule meets specific criteria.
   *
   * @private
   */
  validate() {
    core.debug('Validating rule type...')
    if (this.type === 'AMOUNT' && !this.amount) {
      throw new Error(
        "When setting rule type to 'AMOUNT', rule.amount needs to be specified."
      )
    }
  }
}

/**
 * Manages an array of rules and provides functionality to get matching rules.
 *
 * @class Rules
 */

export class Rules {
  /**
   * Constructs a new instance of the Rules class, initializing with provided rules.
   *
   * @param {Array} rules - Array of rule objects to initialize with
   * @returns {Rules} An instance of the Rules class
   */
  constructor(rules) {
    this.rules = []
    this.init(rules)
  }

  /**
   * Initializes the Rules class by mapping over provided rules and creating Rule instances.
   *
   * @private
   */
  init(rules) {
    this.rules = rules.map(rule => new Rule(rule))
  }

  /**
   * Retrieves the default rule defined for the system.
   *
   * @returns {Rule} The default rule if found, else throws an error
   */
  getDefaultRule() {
    core.info('Getting default rule')
    const defaultRule = this.rules.find(rule => rule.default)

    if (defaultRule) {
      core.info('Default rule found')
      return defaultRule
    } else {
      throw new Error('No default rule exists!')
    }
  }

  /**
   * Finds the matching rule based on a given condition.
   *
   * @param {string} condition - The condition to check against rules' regex patterns
   * @returns {Rule} The matching rule, or null if none match
   */
  getMatchingRule(condition) {
    core.debug('Attempting to find matching rule for condition: ' + condition)
    try {
      for (const rule of this.rules) {
        if (!rule.regex) {
          core.debug('Skipping rule without a regex pattern')
          continue
        }

        // Ensure that regex is a valid RegExp object
        if (typeof rule.regex === 'string') {
          const regex = new RegExp(rule.regex)
          core.debug(
            `Testing condition "${condition}" against regex ${rule.regex}`
          )
          if (regex.test(condition)) {
            return rule
          }
        } else if (rule.regex instanceof RegExp) {
          const matches = rule.regex.test(condition)
          core.debug(
            `Condition "${condition}" matches regex ${rule.regex.toString()}: ${matches}`
          )
          if (matches) {
            return rule
          }
        } else {
          throw new Error(
            'Invalid regex type provided. Please use a string or RegExp object.'
          )
        }

        // If no match found, move to the next rule
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
      throw new Error('No matching rule and no default rule exists.')
    }
  }
}
