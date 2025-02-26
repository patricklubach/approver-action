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
exports.check = void 0;
const core = __importStar(require("@actions/core"));
/**
 * A utility class for evaluating review rules and determining their fulfillment status.
 *
 * @class Check
 */
class Check {
    /**
     * Constructs an instance of the Check class.
     * The constructor does not take any parameters.
     */
    constructor() { }
    /**
     * Checks if a given rule is fulfilled based on the provided reviews and reviewers.
     *
     * @param rule - The review rule to check, containing a 'type' property that can be 'ALL', 'AMOUNT', or 'ONE_OF_EACH'.
     * @param reviews - An array of review objects, each containing user information and their comments.
     * @param reviewers - An array of reviewer objects, where each reviewer has an 'id' (login) and a 'type' ('user' or 'team').
     * @returns True if the rule is fulfilled; False otherwise.
     * @throws {Error} If the rule type is not recognized.
     */
    isFulfilled(rule, reviews, reviewers) {
        core.info(`Check if rule is fulfilled...`);
        core.debug(`Rule type is '${rule.type}'`);
        switch (rule.type) {
            case 'ALL':
                core.debug(`Rule type is 'ALL'`);
                for (const reviewer of reviewers.allReviewers) {
                    core.debug(`Validating reviewer: ${reviewer.name}`);
                    const validated = reviews.some(review => review.user.login === reviewer.name);
                    if (!validated) {
                        return false;
                    }
                }
                return true;
            case 'AMOUNT':
                core.debug(`Rule type is 'AMOUNT'`);
                let approvalCounter = 0;
                for (const reviewer of reviewers.allReviewers) {
                    core.debug(`Validating reviewer: ${reviewer.name}`);
                    const validated = reviews.some(review => review.user.login === reviewer.name);
                    if (validated) {
                        approvalCounter++;
                    }
                }
                return approvalCounter >= rule.amount;
            case 'ONE_OF_EACH':
                core.debug(`Rule type is 'ONE_OF_EACH'`);
                for (const review of reviews) {
                    const name = review.user.login;
                    core.debug(`Validating reviewer: ${name}`);
                    // Search desired reviewers if matches pr reviewer
                    // user reviewers take prcedence over team members
                    for (const reviewer of reviewers.userReviewers) {
                        if (reviewer.type === 'user') {
                            if (name === reviewer.name && !reviewer.checked) {
                                reviewer.checked = true;
                                break;
                            }
                        }
                    }
                    // when reviewer is not found in defined users. Search for reviewer in teams
                    for (const reviewer of reviewers.teamReviewers) {
                        if (reviewer.type === 'team') {
                            if (reviewer.isMember(name) && !reviewer.checked) {
                                reviewer.checked = true;
                                break;
                            }
                        }
                    }
                    // check if all reviewers are checked
                    for (const reviewer of reviewers.userReviewers) {
                        if (!reviewer.checked) {
                            return false;
                        }
                    }
                    for (const reviewer of reviewers.teamReviewers) {
                        if (!reviewer.checked) {
                            return false;
                        }
                    }
                }
                return true;
            default:
                return false;
        }
    }
}
exports.check = new Check();
