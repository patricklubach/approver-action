class Rule {
  constructor(rule) {
    this.regex = rule.regex
    this.type = rule.type
    this.amount = rule.amount || null
    this.reviewers = new Reviewers(rule.reviewers)
    this.default = rule.default || false
  }
}

class Rules {
  constructor(rules) {
    this.rules = []
    this.init(rules)
  }

  init(rules) {
    this.rules = rules.map(rule => new Rule(rule))
  }

  getDefaultRule() {
    const defaultRule = this.rules.find(rule => rule.default)

    if (defaultRule) {
      return defaultRule
    } else {
      throw new Error('No default rule found!')
    }
  }

  getMatchingRule(condition) {
    core.debug('Trying to get matching rule')
    try {
      this.rules.find(rule => {
        // Ensure the pattern is a RegExp object if it's provided as a string
        if (typeof rule.regex === 'string') {
          var regex = new RegExp(rule.regex)
        } else {
          throw new Error(`Invalid regular expression.`)
        }

        // Test the string against the regex pattern
        const isValid = regex.test(conditionValue)
        core.debug(
          `Check that "${conditionValue}" matches regex ${rule.regex} => ${isValid}`
        )
        if (isValid) {
          return rule
        }
      })
    } catch (error) {
      throw new Error(`Invalid regex pattern. Details: ${error.message}`)
    }
    core.warning(
      `No rule regex matches pattern "${condition}". Trying to fallback to default rule`
    )
    try {
      return this.getDefaultRule()
    } catch (error) {
      core.error(error)
      throw new Error(
        'No rule matches pattern and no default rule was defined!'
      )
    }
  }
}
