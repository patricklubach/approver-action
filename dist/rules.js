"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rules = exports.Rule = void 0;
const core = __importStar(require("@actions/core"));
const entities_js_1 = require("./entities.js");
/**
 * Manages and validates rules for review system operations.
 *
 * @class Rules
 * @param rule - The rule object containing configuration properties
 */
class Rule {
    amount;
    default;
    regex;
    reviewers;
    reviewersRaw;
    type;
    constructor(rule) {
        this.amount = rule?.amount ?? 0;
        this.default = rule?.default ?? false;
        this.regex = new RegExp(rule.regex);
        this.reviewers = (0, entities_js_1.buildEntities)(rule.reviewers);
        this.reviewersRaw = rule.reviewers;
        this.type = rule?.type ?? 'ALL';
        this.#validate();
    }
    /**
     * Validates that the rule meets specific criteria.
     *
     * @private
     */
    #validate() {
        core.debug('Validating rule type...');
        if (this.type === 'AMOUNT' && !this.amount) {
            throw new Error("When setting rule type to 'AMOUNT', rule.amount needs to be specified.");
        }
    }
}
exports.Rule = Rule;
/**
 * Manages an array of rules and provides functionality to get matching rules.
 *
 * @param rules - Array of rule objects to initialize with
 */
class Rules {
    rules;
    constructor(rules) {
        this.rules = [];
        this.#init(rules);
    }
    /**
     * Initializes the Rules class by mapping over provided rules and creating Rule instances.
     *
     * @private
     * @param rules - List of rules to create a Rule
     */
    #init(rules) {
        this.rules = rules.map((rule) => new Rule(rule));
    }
    /**
     * Retrieves the default rule defined for the system.
     *
     * @returns {Rule} The default rule if found, else throws an error
     */
    getDefaultRule() {
        core.info('Getting default rule');
        const defaultRule = this.rules.find(rule => rule.default);
        if (defaultRule) {
            core.info('Default rule found');
            return defaultRule;
        }
        else {
            throw new Error('No default rule found!');
        }
    }
    /**
     * Finds the matching rule based on a given condition.
     *
     * @param condition - The condition to check against rules' regex patterns
     * @returns The matching Rule
     */
    getMatchingRule(condition) {
        core.debug(`Attempting to find matching rule for condition: ${condition}`);
        try {
            for (const rule of this.rules) {
                if (rule.regex.test(condition)) {
                    return rule;
                }
                throw new Error('Invalid regex type provided. Please use a string or RegExp object.');
            }
        }
        catch (error) {
            throw new Error(`Regular expression check failed. Details: ${error.message}`);
        }
        core.warning(`No rule matching pattern matches condition "${condition}". Trying to fallback to default rule`);
        try {
            return this.getDefaultRule();
        }
        catch (error) {
            core.error(error.message);
            throw new Error('No matching rule and no default rule exists.');
        }
    }
}
exports.Rules = Rules;
