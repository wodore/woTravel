# coding: utf-8
"""Provides implementation of User model and User"""
from __future__ import absolute_import

from google.appengine.ext import ndb
import model
import util


class AvatarSuggestionCache(model.Base):
    """A class describing datastore users."""
    name = ndb.StringProperty(required=True,default='')
    data = ndb.JsonProperty(required=False, indexed=False,compressed=True)

    PUBLIC_PROPERTIES = ['name', 'result']

    PRIVATE_PROPERTIES = ['']

    @classmethod
    def set(cls,name,data):
        name_lower = "".join(name.lower().split(" ")).strip()
        key = ndb.Key(model.AvatarSuggestionCache, name_lower)
        db = model.AvatarSuggestionCache(key = key,
                name = name, data = data)
        try:
            db.put()
            return True
        except:
            return False

    @classmethod
    def get(cls,name,ago=30):
        """ago is how long ago it was saved, if it to old a miss is returned"""
# TODO implement ago
        name_lower = "".join(name.lower().split(" ")).strip()
        db = ndb.Key(model.AvatarSuggestionCache, name_lower).get()
        if db:
            return db.data
        else:
            return False

    @classmethod
    def qry(cls, name=None, **kwargs):
        """Query for fellow-travelers"""
        qry = model.Base.qry(model.AvatarSuggestionCache,**kwargs)
        if name:
            qry = qry.filter(cls.name==name)
        return qry



