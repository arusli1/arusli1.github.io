---
layout: about
title: about
permalink: /
subtitle: # your tagline / affiliation goes here

profile:
  align: right
  image: prof_pic.jpg
  image_circular: false # crops the image to make it circular
  more_info: # optional: contact info / address shown under your photo

selected_papers: true # includes a list of papers marked as "selected={true}"
social: true # includes social icons at the bottom of the page

announcements:
  enabled: false # includes a list of news items
  scrollable: true # adds a vertical scroll bar if there are more than 3 news items
  limit: 5 # leave blank to include all the news in the `_news` folder

latest_posts:
  enabled: false
  scrollable: true # adds a vertical scroll bar if there are more than 3 new posts items
  limit: 3 # leave blank to include all the blog posts
---

<style>
  /* Rounder corners on the profile photo (default theme radius is small) */
  .profile img {
    border-radius: 24px;
  }
  /* Make the profile photo a bit smaller */
  .profile {
    max-width: 200px;
  }
  /* Larger bio text */
  article p {
    font-size: 1.15rem;
    line-height: 1.7;
  }
  /* Capitalize the "Selected Publications" heading */
  .post > article > h2 {
    text-transform: capitalize;
  }
  /* Widen publication entries: shrink the badge column, give the space to the text */
  @media (min-width: 576px) {
    .publications .col-sm-2 {
      flex: 0 0 13%;
      max-width: 13%;
    }
    .publications .col-sm-8 {
      flex: 0 0 87%;
      max-width: 87%;
    }
  }
  /* Colored venue badges: white text, no link underline */
  .publications .badge,
  .publications .badge a,
  .publications .badge div {
    color: #fff;
    text-decoration: none;
  }
  /* Compact, standard-size link buttons (Paper, Abs, ...) */
  .publications .links .btn {
    padding: 0.2rem 0.55rem;
  }
  /* Mobile tweaks */
  @media (max-width: 575.98px) {
    /* Stack the photo above the text (no float / no text wrapping around it) */
    .post > article > .profile {
      float: none;
      display: block;
      margin: 0 auto 1.25rem auto;
    }
    /* Stack each publication like the reference sites: compact badge on its own
       line (top), then title/authors/venue below. */
    .publications ol.bibliography li .row {
      display: block;
    }
    .publications ol.bibliography li .col.col-sm-2.abbr {
      display: block;
      width: 100%;
      max-width: none;
      padding: 0;
      margin-bottom: 0.5rem;
      text-align: left;
    }
    .publications ol.bibliography li .abbr .badge {
      display: inline-block !important;
      width: auto !important;
    }
    .publications ol.bibliography li [id][class*="col-sm-"] {
      display: block;
      width: 100%;
      max-width: none;
      padding: 0;
    }
  }
  /* Vertically center the photo and bio text as a row (photo on the right);
     everything else (publications, socials) stacks full-width below. */
  @media (min-width: 576px) {
    .post > article {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
    }
    .post > article > * {
      order: 3;
      width: 100%;
    }
    .post > article > .clearfix {
      order: 1;
      width: auto;
      flex: 1 1 300px;
    }
    .post > article > .profile {
      order: 2;
      width: auto;
      margin-left: 1.75rem;
    }
  }
</style>

I am an undergrad at [Harvard](https://www.harvard.edu/) with interests in efficient machine learning and model architectures. I'm currently at [NVIDIA](https://www.nvidia.com/en-us/) working on inference optimization for [TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM), and previously worked at [AWS Annapurna Labs](https://www.amazon.jobs/content/en/teams/annapurna-labs) on quantization and kernels for [Trainium](https://aws.amazon.com/ai/machine-learning/trainium/).
