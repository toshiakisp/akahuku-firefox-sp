

include VERSIONS.in

XPI_INCLUDES = background common options content _locales manifest.json license.txt
XPI_EXCLUDES = "*/Makefile" "*/Makefile.in" "*.template"

all: version

xpi: version
	(cd akahuku && zip -q -r -9 ../akahuku-ext-$(VERSION).xpi $(XPI_INCLUDES) -x $(XPI_EXCLUDES))

version: update.json akahuku/manifest.json

%.json: %.json.template VERSIONS.in
	sed -e 's/__EXTENSION_VERSION__/$(VERSION)/;s/__FX_MAX_VERSION__/$(FX_MAX_VERSION)/;s/__FX_MIN_VERSION__/$(FX_MIN_VERSION)/' < $< > $@

