
include Makefile.in
IDL_PATH := $(XULRUNNER_SDK_PATH)/idl/ -I components
TYPELIB := python $(XULRUNNER_SDK_PATH)/sdk/bin/typelib.py -I $(IDL_PATH)

.SUFFIXES: .idl .xpt
.idl.xpt:
	$(TYPELIB) -o $@ $<

all: xpt
	
xpt: arIAkahukuP2PServant2.xpt arIAkahukuP2PServantListener.xpt arIAkahukuProtocolHandler.xpt

arIAkahukuP2PServant2.xpt: idl/arIAkahukuP2PServant2.idl 
	($(TYPELIB) -o $@.new $< && mv $@.new $@ || rm -f $@.new)

arIAkahukuP2PServantListener.xpt: idl/arIAkahukuP2PServantListener.idl 
	($(TYPELIB) -o $@.new $< && mv $@.new $@ || rm -f $@.new)

arIAkahukuProtocolHandler.xpt: idl/arIAkahukuProtocolHandler.idl 
	($(TYPELIB) -o $@.new $< && mv $@.new $@ || rm -f $@.new)

