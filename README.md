# CR-Tourney-Widget
Displays tournament info and a list of the top 10 players (or less) on a leaderboard.

## How to Install

**Via Link**  
Click the following link and sign-in ➜ https://seapi.c4ldas.com.br/overlays/install/1764126358396  

**Manually**  
https://streamelements.com/dashboard/overlays ➜ "New Overlay" ➜ Start  
Click the blue + in the bottom left corner ➜ Static/Custom ➜ Custom Widget  
Copy each file and paste it in the corresponding tab (ie. HTML in the HTML tab)  
Re-size the widget to your liking (Should have greater height than width)

## Putting It Into OBS
In OBS, create a new 'Browser Source'  
Copy the overlay URL from StreamElements and paste it as the Browser Source URL  
Set the Browser Source width to 1920 and the height to 1080.  
Crop the source by holding ALT whild adjusting the boundaries of the widget.  
  
After the widget is placed properly in your overlay, go back into StreamElements and disable the 'Always Visible' checkbox.

## Commands:
`!tourney start <tournament-tag> (password)`  
*Ex: !tourney start #P58TG02E 1234*

!tourney stop

## Warning
Limit of one tourney active at a time per IP.  
Abuse of the API endpoint will result in an IP ban.
