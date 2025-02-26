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
exports.run = run;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const check_js_1 = require("./check.js");
const config_js_1 = require("./config.js");
const inputs_js_1 = require("./inputs.js");
const pr = __importStar(require("./pullrequest.js"));
const rules_js_1 = require("./rules.js");
const utils = __importStar(require("./utils.js"));
const version_js_1 = require("./version.js");
/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
async function run() {
    try {
        core.info(`Starting reviewer action (version: ${version_js_1.version})`);
        utils.validateEvent(github.context.eventName);
        const eventPayload = github.context.payload;
        const owner = eventPayload?.pull_request?.head.repo.owner.login ?? '';
        const reponame = eventPayload?.pull_request?.head.repo.name ?? '';
        const prNumber = eventPayload?.pull_request?.number ?? 0;
        // Validate event payload
        if (!owner) {
            throw new Error('Could not find owner of repository in event payload!');
        }
        if (!reponame) {
            throw new Error('Could not find repo name of repository in event payload!');
        }
        if (prNumber === 0) {
            throw new Error('Could not find number of pull requeest in event payload!');
        }
        const { data: pullRequestData } = await pr.getPullRequest(owner, reponame, prNumber);
        const { data: pullRequestReviews } = await pr.getReviews(owner, reponame, prNumber);
        const pullRequest = new pr.PullRequest(pullRequestData, pullRequestReviews);
        const config = new config_js_1.Config(inputs_js_1.inputs.configPath);
        const rules = new rules_js_1.Rules(config.rules);
        const condition = utils.getCondition(config.conditionType, pullRequest);
        const matchingRule = rules.getMatchingRule(condition);
        const reviewers = matchingRule.reviewers;
        // if set_reviewers action property is set to true on the action,
        // check if requested reviewers are already set on pr.
        // if not these are set according to the reviewers rule.
        // Note: All previously set reviewers on the pr are overwritten and reviews are resetted!
        if (inputs_js_1.inputs.setReviewers === 'true') {
            core.debug('set_reviewers property is set to true');
            pullRequest.setPrReviewers(matchingRule.reviewersRaw);
            return;
        }
        // Filter list of reviews by status 'APPROVED'
        const approvedReviews = pullRequest.reviews.filter((review) => review.state === 'APPROVED');
        // Check whether all conditions are met
        if (!check_js_1.check.isFulfilled(matchingRule, approvedReviews, reviewers)) {
            throw new Error('Rule is not fulfilled!');
        }
        core.info(`Success! Rule is fulfilled!`);
    }
    catch (error) {
        // Fail the workflow run if an error occurs
        core.setFailed(`Reviewers Action failed! Details: ${error.message}`);
    }
}
