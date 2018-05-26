

include VERSIONS.in
VERSION := $(BASE_VERSION).$(PATCH_VERSION)

all: version xpt
	
xpi: version xpt
	(cd akahuku && zip -q -r -9 ../akahuku-$(VERSION).xpi chrome components modules webextension chrome.manifest install.rdf bootstrap.js license.txt -x "*/Makefile" "*/Makefile.in" "*.template")

version: akahuku/install.rdf akahuku/chrome/content/version.js update.rdf

akahuku/install.rdf: akahuku/install.rdf.template VERSIONS.in
	sed -e 's/__EXTENSION_VERSION__/$(VERSION)/;s/__FX_MAX_VERSION__/$(FX_MAX_VERSION)/;s/__EXTENSION_ID__/$(EXTENSION_ID)/;s/$$/\r/' < $< > $@

akahuku/chrome/content/version.js: akahuku/chrome/content/version.js.template VERSIONS.in
	sed -e 's/__EXTENSION_VERSION__/$(VERSION)/;s/__FX_MAX_VERSION__/$(FX_MAX_VERSION)/;s/__EXTENSION_ID__/$(EXTENSION_ID)/;s/$$/\r/' < $< > $@

update.rdf: update.rdf.template VERSIONS.in
	sed -e 's/__EXTENSION_VERSION__/$(VERSION)/;s/__FX_MAX_VERSION__/$(FX_MAX_VERSION)/;s/__EXTENSION_ID__/$(EXTENSION_ID)/;s/$$/\r/' < $< > $@

xpt: 
	(cd akahuku/components/ && $(MAKE) all)

