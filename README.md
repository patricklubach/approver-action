# reviewers action

This action checks if all approvals of a PR match given rules.

## Inputs

### `gh_token`

**Required** The Github token to access the repository to check.

### `reviewers_file`

**Optional** The path to the file where approver rules are defined. The syntax
of the file is as follows:

```yaml
check_on: title

rules:
  - regex: ^feature/
    reviewers:
      - team:MyApproverGroup
      - user:RobotUser9
  - regex: ^bugfix/
    reviewers:
      - user:Foo
```

**Default**: `.reviewers.yaml`

## Outputs

None

## Example usage

When you want to let the action set the reviewers for each pull request for you:

```yaml
name: Set reviewers

on:
  pull_request:
    types:
      - opened
      - reopened
      - ready_for_review
      - review_requested
      - review_request_removed

permissions:
  contents: read
  pull-requests: write

jobs:
  set_reviewers:
    name: Set reviewers
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        id: checkout
        uses: actions/checkout@v4

      - name: Install Dependencies
        id: npm-ci
        run: npm ci

      - name: Set reviewers
        uses: ./
        with:
          reviewers_file: .reviewers.yaml
          token: ${{ secrets.GITHUB_TOKEN }}
          pr_number: ${{ github.event.pull_request.number }}
          set_reviewers: true
```

When you want to let the action check the reviewes when a review was dismissed or submitted:

```yaml
name: Check reviews

on:
  pull_request_review:
    types: [dismissed, submitted]

permissions:
  contents: read
  pull-requests: write

jobs:
  check_reviews:
    name: Check reviews
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        id: checkout
        uses: actions/checkout@v4

      - name: Install Dependencies
        id: npm-ci
        run: npm ci

      - name: Check reviews
        id: check-reviews
        uses: ./
        with:
          reviewers_file: .reviewers.yaml
          token: ${{ secrets.GITHUB_TOKEN }}
          pr_number: ${{ github.event.pull_request.number }}
```

## Configuration examples

In the following there is a minimal example of the `.reviewers.yaml` file. If no other option is being used then every listed approver needs to approve the PR to fulfill the requirement. If a team is defined then each member of the team needs to approve the PR.

```yaml
rules:
- regex: ^feature/
  reviewers:
    - team:MyApproverGroup
    - user:RobotUser9
```

You can limit how many reviewers need to approve the pull request by setting the `count` keyword:

```yaml
rules:
- regex: ^feature/
  count: 1
  reviewers:
    - team:MyApproverGroup
    - user:RobotUser9
```

You can have different rules for defined regex pattern like below:

```yaml
rules:
- regex: ^feature/
  reviewers:
    - team:MyApproverGroup
    - user:RobotUser9
- regex: ^bugfix/
  reviewers:
    - user:Foo
```

You can also define a default rule which is identified by the default keyword. If you have multiple default rules defined the first which is found is being returned and is applied to the PR:

```yaml
rules:
- regex: ^feature/
  reviewers:
    - team:MyApproverGroup
    - user:RobotUser9
- regex: ^bugfix/
  reviewers:
    - user:Foo
- default: true
  reviewers:
    - user:Foo
```

In default configuration the approver action is checking on the branch of the pull request. You can configure that behaviour by setting the `check_on` configuration on a per rule base:

```yaml
check_on: branch

rules:
  - regex: ^feature/
    reviewers:
      - team:MyApproverGroup
      - user:RobotUser9
  - regex: ^bugfix/
    reviewers:
      - user:Foo
  - default: true
    reviewers:
      - user:Foo
```

## Test locally

To test the action locally, first install [`act`](https://github.com/nektos/act). Then you need to create a `event.json` file to match an already open pull request. For more information see [act documentation](https://nektosact.com/usage/index.html#skipping-jobs). Afterwards you can simply run:

```bash
npm run test:local
```
