---
layout: page
title: Let's talk about CTO.coffee
permalink: /contact/
---

Please use below form to contact me or send me an email at `benjamin@<thisdomain>`.

<div class="py2">
  <form action="https://formspree.io/{{ site.email }}" method="POST" class="form-stacked form-light">
    <input type="text" name="_replyto" class="input mobile-block" placeholder="Email Address">
    <textarea type="text" name="content" class="input mobile-block" rows="5" placeholder="What would you like to say?"></textarea>
    <input type="hidden" name="_next" value="/thanks" />
    <input type="hidden" name="_subject" value="New submission!" />
    <input type="text" name="_gotcha" style="display:none" />

  <p>
    By using this form to contact me, you're agreeing that the information you provide in the form is processed by <a
    href="https://formspree.io">formspree.io</a>. The <a href="/privacy">privacy page</a> contains more information about
    what this means.
  </p>

    <input type="submit" class="button button-blue button-big mobile-block" value="Say Hello">
  </form>
</div>
