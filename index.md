---
layout: page
title: "Let's talk about people & tech"
date: 2017-05-05
categories: []
tags: cto-coffee
---

CTO.coffee is a new podcast series, where [I][benjamin] chat with varying guests about the people side of technology and
developing software, preferably while having a coffee together.

You like talking about the human side of technology? I'd love to talk to you then, do [reach out][contact] and let's
have a chat.

## Episodes

<div class="home">
  <div class="posts">
    {% for post in site.posts %}
      <div class="post">
        <a href="{{ post.url }}" class="post-link">
          <p class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</p>
          <h3 class="h3 post-title">{{ post.title }}</h3>
          <p class="post-summary">{{ post.summary }}</p>
        </a>
      </div>
    {% endfor %}
  </div>
</div>



[benjamin]: http://squeakyvessel.com/about/
[contact]:  {{ site.baseurl }}contact/
