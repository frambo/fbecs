exports.jobadm = function(req, res) {
	if (req.user === undefined)
		res.render('jobadm', {
			title: 'ECS Express',
			user: null
		});
	else
		res.render('jobadm', {
			title: 'ECS Express',
			user: req.user
		});
}