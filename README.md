README

From https://evamaerey.github.io/what_how_guides/academic_website_w_blogdown

    Step 0: Link to Dan Quintana’s thread for reference
    Step 1: Install blogdown by running install.packages(“blogdown”) in the console
    Step 2: Create file structure in RStudio with File -> New Project … -> New Directory -> Website Using Blogdown -> Hugo theme: gcushen/hugo-academic
    Step 3: Load blogdown with library(blogdown)
    Step 4: Install the “hugo” website framework with blogdown::install_hugo(force = TRUE)
    Step 5: Build the template blogdown::serve_site()
        Note: I found that sometimes expected changes wouldn’t appear withough first Building the site with rmarkdown::render_site(encoding = ‘UTF-8’) and Building the template use blogdown::serve_site()
    Step 6: Changing the title of your website in the “config.toml”
    Step 7: Change color/theme/font of your website in “config/_default/params.toml”
    Step 8: Adjust what widgets show up in each of the .md files in “content/home/”, e.g. in “content/home/hero.md”, “active = true” to “active = false”
        Note: For the Gallery widget, go into the gallery folder and edit “index.md”
    Step 9: Update your profile photo by saving your photo as ‘avatar.jpg’ in the “content/authors/admin” folder
    Step 10: Edit your biography details in the “content/authors/admin/_index.md” file
    Step 11: Edit your contact details in the “Contact Widget setup” section of config/_default/params.toml"
    Step 12: Add your CV by copying your CV to “static/files/cv.pdf” and uncommenting
    Step 13: Periodically view updates by serving site using blogdown:::serve_site()
    Step 14: Add your publications in the “content/publication/” folder
        Step 14a:
        Step 14b: Edit your publication’s details
        Step 14c: Include image to be associated with your paper
        Note: Change tags for Papers, Talks, and Projects by editing the YAML
    Step 15: Change what appears in header menu *by editing config/_default/menus.toml*
    Step 16: Deploy your website - one way is using Netlify
        Step 16a. Create a free account with @Netlify
        Step 16b. drag the “public” folder into the box at the bottom of the “deploys” section of your Netlify admin settings.
        Step 16c. Edit your domain name, which will include “netlify” at the end of your address.

