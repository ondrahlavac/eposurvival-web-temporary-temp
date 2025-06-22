<?php
$errors = '';
$myemail = 'contact@domain.com'; // Put Your email address here.

$name = $_POST['name'];
$email_address = $_POST['email'];
$message = $_POST['message'];


if( empty($errors))
{
	$to = $myemail;
	$email_subject = "New message from $name";
	$email_body = "You have received a new message from $name. ".
	" Here are the details:\n Name: $name \n Email: $email_address \n Message: \n $message";

	$headers = "From: $email_address\n"; // $myemail
	$headers .= "Reply-To: $email_address";

	mail($to,$email_subject,$email_body,$headers);
	// Redirect to the 'thank you' page after sending message
	header('Location: message-sent.html');
}
?>
