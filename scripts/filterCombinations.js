// borrowed from https://github.com/Gozala/querystring
function parse(qs, eq) {
  var sep = '&';
  eq = eq || '='
  var obj = {};
  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (Array.isArray(obj[k])) {
      obj[k].push(v);
    } else if (obj[k]) {
      obj[k] = [obj[k], v];
    } else {
      obj[k] = v;
    }
  }

  return obj;
}

function getFilters(event) {
  var url = event.properties.$current_url;
  hash = parse(url.substring(url.indexOf('#?') + 2));
  var ret = '';
  if (Array.isArray(hash.filters)) {
    hash.filters.sort();
    hash.filters.forEach(function(value) {
      if (ret !== '') {
        ret += '&';
      }
      ret += value.substring(0, value.indexOf(':'));
    });
  } else if (hash.filters) {
    ret += hash.filters.substring(0, hash.filters.indexOf(':'));;
  }
  return ret;
}

function main() {
  return Events({
    from_date: params.from_date,
    to_date: params.to_date,
    event_selectors: [{event: "Loaded a Page"}, {event: "hashChange"}]
  }).filter(function (event) {
    // only care about the production filters
    if (event.properties.$current_url && event.properties.$current_url.indexOf('app.mux.io') < 0) {
      return false;
    }
    // if it's the event, we're good
    if (event.name === 'hashChange') {
      return true;
    } else { // otherwise only if there's a hash param
      return event.properties.$current_url.indexOf('#') > 0;
    }
  }).groupBy([getFilters], mixpanel.reducer.count())
  .map(function (object) {
    var filters = object.key[0].split('&');
    return {
      filters: filters,
      count: object.value
    };
  });
}
