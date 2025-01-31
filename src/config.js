import fs from 'fs'
import YAML from 'yaml'

class Config {
  constructor(configPath) {
    this.config = this.read(configPath)
    this.checkOnType = this.config.check_on || 'branch_name'
    this.rules = buildRules(this.config.rules)

    this.validate()
  }

  read(configPath) {
    try {
      return YAML.parse(fs.readFileSync(configPath, 'utf8'))
    } catch (error) {
      throw new Error(
        `Cannot get data from config file at ${configPath}. Details: ${error.message}`
      )
    }
  }

  validate() {
    if (
      !this.checkOn ||
      (this.checkOn !== 'branch_name' && this.checkOn !== 'title')
    ) {
      throw new Error(
        `Invalid check_on property. Use one of: 'branch_name', 'title'. Got: ${this.checkOnType}`
      )
    }
    if (!Array.isArray(this.rules)) {
      throw new Error(
        `Invalid rules property. 'rules' property is either not defined or empty!`
      )
    }
  }
}

export { Config }
