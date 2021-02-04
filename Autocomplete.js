export default class Autocomplete {
  constructor(rootEl, options = {}) {
    options = Object.assign({numOfResults: 5, data: []}, options);
    Object.assign(this, {rootEl, options});

    this.data = [];
    this.keyboardHandler = null;
    this.value = '';
    this.init();
    this.initkeyboardHandlerObject();
  }

  updateValue(value) {
    this.value = value
  }

  onQueryChange(query) {
    // Get data for the dropdown
    if (query) {
      this.updateValue(query)
      this.data = [];
      if(this.keyboardHandler) this.keyboardHandler.removeListener();
      return this.getResults(query, this.options.data)
        .then(results => {
          results.slice(0, this.options.numOfResults);
          this.updateDropdown(results);
        });
    }
  }

  /**
   * Given an array and a query, return a filtered array based on the query.
   */
  getResults(query, data) {
    if (!query) return [];

    if (process.env.USE_HTTP_ENDPOINT && process.env.USE_HTTP_ENDPOINT === 'true') {
      return fetch(`https://api.github.com/search/users?q=${query.toLowerCase()}&per_page=${this.options.numOfResults}`)
        .then((rawResult) => {
          return rawResult.json()
        })
        .then((JSONresult) => {
          if (JSONresult && JSONresult.items && JSONresult.items.length) {
            const results = JSONresult.items.map(item => {
              return {
                text: item.login,
                value: item.login
              }
            });
            this.data = results;
            return results
          } else {
            return []
          }
        })
    } else {
      // Filter for matching strings
      let results = data.filter((item) => {
        return item.text.toLowerCase().includes(query.toLowerCase());
      });
      this.data = results;
      return Promise.resolve(results);
    }
  }

  initkeyboardHandlerObject(){
    // define an listener object to allow its deletion each time a new search is performed
    let listItems = null;
    let currentLI = 0;

    const {onSelect} = this.options;
    const selectItem = this.selectItem.bind(this)
    const self = this;
    let dataArray = this.data;

    this.keyboardHandler = {
        handler: function (event) {
          switch (event.keyCode) {
            case 38: // Up arrow
              // Remove the highlighting from the previous element
              listItems[currentLI].classList.remove("highlight");

              currentLI = currentLI > 0 ? --currentLI : 0;     // Decrease the counter
              listItems[currentLI].classList.add("highlight"); // Highlight the new element
              break;
            case 40: // Down arrow
              // Remove the highlighting from the previous element
              listItems[currentLI].classList.remove("highlight");

              currentLI = currentLI < listItems.length - 1 ? ++currentLI : listItems.length - 1; // Increase counter
              listItems[currentLI].classList.add("highlight");       // Highlight the new element
              break;
            case 13 :
              if (typeof onSelect === 'function') onSelect(dataArray[currentLI].value);
              selectItem(dataArray[currentLI].value)
              break;
          }
        },

        addListener: function() {
          listItems = document.querySelectorAll(".results li");
          if(listItems && listItems[currentLI]) {
            listItems[currentLI].classList.add("highlight");
            dataArray = self.data;
            document.addEventListener('keydown', this.handler);
          }
        },

        removeListener: function() {
          document.removeEventListener('keydown', this.handler);
        },

        initObject: function() {
          this.handler = this.handler.bind(this);
          return this;
        }
      };

    this.keyboardHandler.initObject()
  }

  updateDropdown(results) {
    this.listEl.innerHTML = '';
    this.listEl.appendChild(this.createResultsEl(results));

    // handle navigation through keyboard
    this.keyboardHandler.addListener()
  }

  selectItem(selectedItem) {
    this.inputEl = this.createQueryInputEl(selectedItem)
    this.rootEl.prepend(this.inputEl)
  }

  createResultsEl(results) {
    const fragment = document.createDocumentFragment();
    results.forEach((result, index) => {
      const el = document.createElement('li');
      Object.assign(el, {
        className: 'result',
        id: 'resultItem' + index,
        textContent: result.text,
      });

      // Pass the value to the onSelect callback
      el.addEventListener('click', (event) => {
        const { onSelect } = this.options;
        if (typeof onSelect === 'function') onSelect(result.value);
        this.selectItem(result.value)
      });

      fragment.appendChild(el);
    });
    return fragment;
  }

  createQueryInputEl(value=null) {
    const oldInput = document.getElementById('searchInput')

    // remove old input to allow value control
    if(oldInput) {
      document.getElementById('state').removeChild(oldInput)
    }

    // create input element with or without value control depending on the presence of value arg
    const inputEl = document.createElement('input');
    if(value){
      console.log('create')
      Object.assign(inputEl, {
        id:'searchInput',
        name: 'query',
        value: value
      });
    } else {
      Object.assign(inputEl, {
        id:'searchInput',
        name: 'query',
        autocomplete: 'off',
      });
    }

    inputEl.addEventListener('input', event =>
      this.onQueryChange(event.target.value));

    return inputEl;
  }

  init() {
    // Build query input
    this.inputEl = this.createQueryInputEl();
    this.rootEl.appendChild(this.inputEl)

    // Build results dropdown
    this.listEl = document.createElement('ul');
    Object.assign(this.listEl, { className: 'results' });
    this.rootEl.appendChild(this.listEl);
  }
}
