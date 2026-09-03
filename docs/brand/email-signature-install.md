# Email signature: install

One page per person, hosted on the site. Open it in a browser, select all
(Cmd/Ctrl+A), copy, paste into the signature editor of each mail client you
use. The page holds nothing but the signature, so select-all copies exactly
what should land in the editor. Images load from merosyogurt.com, so the
signature never needs re-pasting when the art changes.

| Person | Page |
|---|---|
| Saima Haque | https://merosyogurt.com/signature/signature-saima |
| Kim Long Ly | https://merosyogurt.com/signature/signature-kim-long-ly |

New person: copy `email-signature.html` in this folder to
`public/signature/signature-<first>-<last>.html`, fill the placeholders, add a
row here.

## Where the paste goes

| Client | Path | Note |
|---|---|---|
| Gmail (web) | Settings, See all settings, General, Signature, Create new, paste, Save changes | Set it under "Signature defaults" for new emails and replies |
| Outlook (new, web, Mac) | Settings, Accounts, Signatures, New signature, paste, Save | Set as default for new messages and replies |
| Outlook classic (Windows) | File, Options, Mail, Signatures, New, paste, OK | |
| Apple Mail (Mac) | Settings, Signatures, choose the account, +, paste | Untick "Always match my default message font" |
| iOS Mail, Outlook mobile | Settings, Mail, Signature | Phone clients strip images. Use name and title as plain text there, or no signature. |

Send a test to yourself after pasting. Images that show as broken boxes mean
the client blocked remote images for the preview only; the recipient's client
fetches them normally.
