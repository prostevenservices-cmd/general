<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const RECIPIENT_EMAIL = 'prostevenservices@gmail.com';
const MAX_REQUEST_BYTES = 100000;

function respond(int $status, bool $success, string $message): never
{
    http_response_code($status);
    echo json_encode(
        ['success' => $success, 'message' => $message],
        JSON_UNESCAPED_SLASHES
    );
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, false, 'Method not allowed.');
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > MAX_REQUEST_BYTES) {
    respond(413, false, 'The submitted questionnaire is too large.');
}

// Bots commonly fill this field, while it remains invisible to real visitors.
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    respond(200, true, 'Questionnaire received.');
}

$generalEmail = filter_var(
    trim((string) ($_POST['generalEmail'] ?? '')),
    FILTER_VALIDATE_EMAIL
);

$requiredFields = [
    'mainAddress',
    'mainPhone',
    'emailAccounts',
    'businessModel',
    'websiteAccess',
    'wholesaleApplication',
    'pricingTiers',
    'taxHandling',
    'certificateTracking',
    'pickup',
    'invoicePlatform',
    'supportPlan',
];

foreach ($requiredFields as $field) {
    if (!isset($_POST[$field]) || trim((string) $_POST[$field]) === '') {
        respond(422, false, 'Please complete all required questions.');
    }
}

if ($generalEmail === false) {
    respond(422, false, 'Please provide a valid general email address.');
}

$labels = [
    'domain' => 'Website domain',
    'mainAddress' => 'Main store address',
    'mainPhone' => 'Main phone number',
    'generalEmail' => 'General email address',
    'emailAccounts' => 'Corporate email accounts',
    'businessModel' => 'Business model',
    'salesArea' => 'Sales areas',
    'websiteAccess' => 'Website access',
    'wholesaleApplication' => 'Wholesale application',
    'pricingTiers' => 'Different pricing tiers',
    'tierCount' => 'Number of pricing tiers',
    'taxHandling' => 'Tax handling',
    'certificateTracking' => 'Resale certificate tracking',
    'paymentMethods' => 'Payment methods',
    'storeCredit' => 'Store credit',
    'creditTerms' => 'Customer credit terms',
    'carriers' => 'Shipping carriers',
    'shippingRates' => 'Shipping rates',
    'pickup' => 'Pickup availability',
    'pickupSameAsMain' => 'Pickup uses main store information',
    'pickupAddress' => 'Pickup address',
    'pickupPhone' => 'Pickup phone number',
    'pickupHours' => 'Pickup days and hours',
    'invoicePlatform' => 'Invoice platform',
    'accountingPlatform' => 'Accounting platform',
    'documents' => 'Required documents',
    'supportPlan' => 'Post-launch support',
    'additionalNotes' => 'Additional notes',
];

function cleanValue(mixed $value): string
{
    if (is_array($value)) {
        $items = array_map(
            static fn (mixed $item): string => cleanValue($item),
            $value
        );

        return implode(', ', array_filter($items));
    }

    $text = strip_tags((string) $value);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);

    return trim((string) $text);
}

$lines = [
    'AMY DELUXE USA — ONLINE STORE QUESTIONNAIRE',
    'Website: amydeluxeusa.com',
    'Submitted: ' . date('F j, Y, g:i a T'),
    '',
];

foreach ($labels as $field => $label) {
    if (!isset($_POST[$field])) {
        continue;
    }

    $value = cleanValue($_POST[$field]);
    if ($value !== '') {
        $lines[] = $label . ': ' . $value;
    }
}

$lines[] = '';
$lines[] = 'BUSINESS HOURS';

$days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

foreach ($days as $day) {
    $isOpen = isset($_POST['hours_' . $day . '_open']);
    $start = cleanValue($_POST['hours_' . $day . '_start'] ?? '');
    $end = cleanValue($_POST['hours_' . $day . '_end'] ?? '');
    $hours = $isOpen && $start !== '' && $end !== ''
        ? $start . '–' . $end
        : 'Closed';
    $lines[] = $day . ': ' . $hours;
}

$body = implode(PHP_EOL, $lines);
$host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
$host = preg_replace('/:\d+$/', '', $host);
$host = preg_replace('/[^a-z0-9.-]/', '', (string) $host);
$fromDomain = filter_var($host, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)
    ? $host
    : 'localhost';

$subject = 'Amy Deluxe USA — New questionnaire response';
$headers = [
    'From: Amy Deluxe Questionnaire <questionnaire@' . $fromDomain . '>',
    'Reply-To: ' . $generalEmail,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . PHP_VERSION,
];

$accepted = mail(
    RECIPIENT_EMAIL,
    $subject,
    $body,
    implode("\r\n", $headers)
);

if (!$accepted) {
    respond(
        500,
        false,
        'The server could not send your answers. Please try again or contact us.'
    );
}

respond(200, true, 'Questionnaire sent successfully.');
