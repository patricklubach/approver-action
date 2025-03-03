import * as core from '@actions/core'

import { buildEntities, Reviewers } from './entities.js'
import { ConfigRule } from './interfaces.js'

/**
 * Manages and validates rules for review system operations.
 *
 * @class Rules
 * @param rule - The rule object containing configuration properties
 */

export class Rule {
  amount: number
  default: boolean
  regex: string
  reviewers: Reviewers
  reviewersRaw: string[]
  type: string

  constructor(rule: ConfigRule) {
    this.amount = rule?.amount ?? 0
    this.default = rule?.default ?? false
    if (!rule.regex && rule?.default != true) {
      throw new Error('Rule is invalid. Regex is not set and rule is not default rule!')
    }
    if (typeof rule.regex === 'string') {
      this.regex = rule.regex
    } else {
      this.regex = ""
    }
    this.reviewers = buildEntities(rule.reviewers)
    this.reviewersRaw = rule.reviewers
    this.type = rule?.type ?? 'ALL'

    this.#validate()
  }

  /**
   * Validates that the rule meets specific criteria.
   *
   * @private
   */
  #validate() {
    core.debug(`Validating rule type "${this.type}"...`)
    if (this.type === 'AMOUNT' && !this.amount) {
      throw new Error(
        "When setting rule type to 'AMOUNT', rule.amount needs to be specified."
      )
    }
    core.debug('Validation succesfull!')
  }
}

/**
 * Manages an array of rules and provides functionality to get matching rules.
 *
 * @param rules - Array of rule objects to initialize with
 */
export class Rules {
  rules: Rule[]

  constructor(rules: ConfigRule[]) {
    this.rules = []
    this.#init(rules)
  }

  /**
   * Initializes the Rules class by mapping over provided rules and creating Rule instances.
   *
   * @private
   * @param rules - List of rules to create a Rule
   */
  #init(rules: ConfigRule[]) {
    this.rules = rules.map((rule: any) => new Rule(rule))
  }

  /**
   * Retrieves the default rule defined for the system.
   *
   * @returns {Rule} The default rule if found, else throws an error
   */
  getDefaultRule(): Rule {
    core.info('Trying to get default rule...')
    const defaultRule = this.rules.find(rule => rule.default)

    if (defaultRule) {
      core.info('Default rule found!')
      return defaultRule
    } else {
      throw new Error('No default rule found!')
    }
  }

  /**
   * Finds the matching rule based on a given condition.
   *
   * @param condition - The condition to check against rules' regex patterns
   * @returns The matching Rule
   */
  getMatchingRule(condition: string): Rule {
    core.debug(`Attempting to find matching rule for condition: ${condition}`)
    try {
      for (const rule of this.rules) {
        if (rule.regex === "") {
          continue
        }
        const reg = new RegExp(rule.regex)
        if (reg.test(condition)) {
          core.info(`Matching rule found!`)
          core.debug(JSON.stringify(rule))
          return rule
        }
      }
    } catch (error: any) {
      throw new Error(
        `Regular expression check failed. Details: ${error.message}`
      )
    }
    core.warning(
      `No rule matching pattern matches condition "${condition}". Trying to fallback to default rule`
    )
    try {
      return this.getDefaultRule()
    } catch (error: any) {
      core.error(error.message)
      throw new Error('No matching rule and no default rule exists.')
    }
  }
}
