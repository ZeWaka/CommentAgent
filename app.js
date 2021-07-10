module.exports = (app, { getRouter }) => {
	app.on(
		[
			"issue_comment.created",
			"issue_comment.edited"
		],
		async context => {
			const config = await context.config("commentagent.yml", {
				caseSensitive: true
			});

			if (!config) {
				console.log('Config file named "commentagent.yml" not found. Exiting.');
				return;
			}

			if (context.payload.pull_request === null) {
				console.log('Not a PR. Exiting.')
        return;
			}

			if (typeof config.aliasMappings === 'undefined' || config.aliasMappings === null) {
				console.log('No alias mappings specified in the config. Exiting.')
        return;
			}

			var issueComment = context.payload.comment;
      if (!issueComment) return;

			let commentBody = issueComment.body.slice();
			let PRNumber = context.payload.issue.number;
			let repoName = context.payload.repository.full_name;

			let commentAuthorName = issueComment.user.login;
			let commentAuthorAssociation = issueComment.author_association;

			let PRData = await context.octokit.request(`GET /repos/${repoName}/pulls/${PRNumber}`);
      PRData = PRData.data;
			let PRHeadRef = PRData.head.ref;
			let PRHeadFullName = PRData.head.repo.full_name;
			let PRAuthor = PRData.user.login;

			let metadata = {
				pr_number: PRNumber,
				comment_author: commentAuthorName,
				pr_head_full_repo_name: PRHeadFullName,
				pr_head_ref: PRHeadRef,
			}
      console.log(metadata);

			if (config.caseSensitive === false) {
				commentBody = commentBody.toLowerCase();
			}

			for (let token in config.aliasMappings) {
				let tokenName = token.slice();
				let eventName = config.aliasMappings[token];

				if (config.caseSensitive === false) {
					tokenName = tokenName.toLowerCase();
				}


				if (commentBody.includes(tokenName)) {
					if (isAuthorized(config, commentAuthorAssociation, eventName, PRAuthor, commentAuthorName)) {
						reactComment(context, context.payload, issueComment.id, 'eyes');
						sendDispatch(context, context.payload, eventName, metadata);
						reactComment(context, context.payload, issueComment.id, 'rocket');
					}
				}
			}
		}
	);
};

async function sendDispatch(context, payload, event_type, metadata) {
	await context.octokit.rest.repos.createDispatchEvent(
		{
			owner: payload.repository.owner.login,
			repo: payload.repository.name,
			event_type: event_type,
			client_payload: metadata
		}
	);
}

function isAuthorized(config, association, event, pr_author, comment_author) {
	let map = config.permissionMappings;

	// If no permission map is specified at all, default to member
	if (typeof map === 'undefined' || map === null) {
		if (association == 'MEMBER' || association == 'OWNER') {
			return true;
		} else {
			return false;
		}
	}

	let permission = map[event];
	if (Array.isArray(permission)) {
    if (pr_author == comment_author && permission.includes('PRAUTHOR'))
      return true;

		return permission.includes(association);
	}
	else if (typeof permission === 'string') {
    if (pr_author == comment_author && permission == 'PRAUTHOR')
      return true;

		return association == permission;
	}
	else {
		return false;
	}
}

async function reactComment(context, payload, id, reaction) {
	await context.octokit.rest.reactions.createForIssueComment({
		owner: payload.repository.owner.login,
		repo: payload.repository.name,
		comment_id: id,
		content: reaction,
	});
}
