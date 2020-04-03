const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginNav = require("@11ty/eleventy-navigation");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const { DateTime } = require("luxon");
const CleanCSS = require("clean-css");
const fs = require("fs");

var getIndex = (collection, currentSlug) => {
  let currentIndex = 0;
  collection.filter((page, index) => {
    currentIndex = page.fileSlug == currentSlug ? index : currentIndex;
  });
  return currentIndex;
};

module.exports = function(config) {
  // Plugins
  config.addPlugin(pluginRss);
  config.addPlugin(pluginNav);

  // Filters
  config.addFilter("dateToFormat", (date, format) => {
    return DateTime.fromJSDate(date, { zone: "utc" }).toFormat(String(format));
  });
  config.addFilter("yearRange", (date1Str, date2Str = false) => {
    let date = false;
    let end = false;
    let start = false;
    const date1 = date1Str
      ? DateTime.fromJSDate(date1Str, { zone: "utc" })
      : false;
    const date2 = DateTime.fromJSDate(date2Str, { zone: "utc" });
    if (date1 && date2) {
      end = date1 < date2 ? date2 : date1;
      start = date1 < date2 ? date1 : date2;
    } else {
      end = date2;
    }
    const endYear = end.toFormat("yyyy");
    if (start && end) {
      const startYear = start.toFormat("yyyy");
      if (startYear == endYear) {
        date = endYear;
      } else {
        const startCent = startYear.slice(0, 2);
        const endCent = endYear.slice(0, 2);
        if (startCent == endCent) {
          date = startYear + "&ndash;" + end.toFormat("yy");
        } else {
          date = startYear + "&ndash;" + endYear;
        }
      }
    } else if (end) {
      date = endYear;
    }
    return date;
  });
  config.addFilter("dateToISO", date => {
    return DateTime.fromJSDate(date, { zone: "utc" }).toISO({
      includeOffset: false,
      suppressMilliseconds: true
    });
  });
  config.addFilter("cssmin", css => {
    return new CleanCSS({}).minify(css).styles;
  });
  config.addFilter("nextInCollection", (collection, currentSlug) => {
    const currentIndex = getIndex(collection, currentSlug);
    const pages = collection.filter((page, index) => {
      return index == currentIndex + 1 ? page : false;
    });
    return pages.length ? pages[0] : false;
  });
  config.addFilter("prevInCollection", (collection, currentSlug) => {
    const currentIndex = getIndex(collection, currentSlug);
    const pages = collection.filter((page, index) => {
      return index == currentIndex - 1 ? page : false;
    });
    return pages.length ? pages[0] : false;
  });

  // Collections
  config.addCollection("projectsByDate", collection => {
    const projects = collection.getFilteredByTag("projects");
    return projects.sort(function(a, b) {
      return b.data.dateEnd - a.data.dateEnd;
    });
  });

  // Markdown
  const mdOpts = {
    html: true,
    breaks: true,
    linkify: true,
    typographer: true
  };
  const mdlib = markdownIt(mdOpts).use(markdownItAnchor, {
    permalink: false
  });
  config.setLibrary("md", mdlib);
  config.addNunjucksFilter("markdownify", markdownString =>
    markdownIt(mdOpts).render(markdownString)
  );
  config.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_separator: "<!--more-->" // Matches WordPress style
  });

  // BrowserSync
  config.setBrowserSyncConfig({
    callbacks: {
      ready: function(err, browserSync) {
        const content_404 = fs.readFileSync("_site/404.html");

        browserSync.addMiddleware("*", (req, res) => {
          // Provides the 404 content without redirect.
          res.write(content_404);
          res.end();
        });
      }
    }
  });

  // Pass-thru files
  config.addPassthroughCopy("media");
  config.addPassthroughCopy("admin");

  // Layouts
  config.addLayoutAlias("base", "base.njk");
  config.addLayoutAlias("post", "post.njk");

  // Base Config
  return {
    dir: {
      data: "content/_data"
    },
    templateFormats: ["njk", "md", "html", "liquid"],
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    passthroughFileCopy: true
  };
};
