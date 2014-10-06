<h1> Simple samp Authentication</h1>
<hr />

<form>
	<div class="alert alert-warning">
		<p>
			
		</p>
		<br />
		<input type="text" data-field="sso:saml:idpentrypoint" title="IdP entry point" class="form-control input-lg" placeholder="IdP entry point"><br />
		<input type="text" data-field="sso:saml:callbackpath" title="Callback path" class="form-control input-md" placeholder="Callback path"><br/>
		<input type="text" data-field="sso:saml:issuer" title="Issuer string to supply to identity provider" class="form-control input-md" placeholder="Issuer string to supply to identity provider"><br/>
		<input type="text" data-field="sso:saml:metadata" title="Metadata URL" class="form-control input-md" placeholder="Metadata URL"><br/>

		<input type="text" data-field="sso:saml:servercrt" title="Server CRT file" class="form-control input-md" placeholder="Server CRT file">

		<br/>
		<input type="text" data-field="sso:saml:loginsuccessredirecturl" title="URL to redirect after a successfull login" class="form-control input-md" placeholder="URL to redirect after a successfull login. Leave empty to redirect to /. ">

	</div>
</form>

<button class="btn btn-lg btn-primary" id="save">Save</button>

<script>
	require(['forum/admin/settings'], function(Settings) {
		Settings.prepare();
	});
</script>
