# coding: utf-8
"""Provides implementation of User model and User"""
from __future__ import absolute_import

from google.appengine.ext import ndb
import model
import util
import itertools


class FellowTravelerValidator(model.BaseValidator):
    """Defines how to create validators for user properties. For detailed description see BaseValidator"""
    name = [2, 100]
    email = util.EMAIL_REGEX
    description = [0, 200]

class FellowTraveler(model.Base):
    """A class describing datastore users."""
    name = ndb.StringProperty(required=True,default='', validator=FellowTravelerValidator.create('name'))
    email = ndb.StringProperty(default='', validator=FellowTravelerValidator.create('email', required=False))
    description = ndb.StringProperty(indexed=False, validator=FellowTravelerValidator.create('description'))
    avatar_url = ndb.StringProperty(default='',required=False, indexed=False)
    added_by = ndb.KeyProperty(kind=model.User,required=True) # the user which added this fellow traveller
    tags = ndb.StringProperty(repeated=True) # this is added automatically and is used for suggestions
# custom tags can be added, but use self.tags.append("custom") or self.tags+["tag",""]

    PUBLIC_PROPERTIES = ['avatar_url', 'name', 'email', 'description']

    PRIVATE_PROPERTIES = ['added_by']

    def _pre_put_hook(self):
        if not hasattr(self, 'tags'):
            self.tags = []
        names = self.name.lower().strip().split(' ') \
              + self.email.lower().split('@')[0].strip().split(".")
        names = list(set(filter(None,names))) # unique list without empty entries
        short = [n[0] for n in names]
        short = [ "".join(s) for s in itertools.permutations(short, 2) ]
        #names += short
        combs = []
        for l in range(len(names) if len(names)<10 else 10):
            comb = itertools.permutations(names, l+1)
            combs += [" ".join(c) for c in comb]
        self.tags = list(set(short+combs+self.tags))

    @classmethod
    def qry(cls, name=None, added_by=None, **kwargs):
        """Query for fellow-travelers"""
        qry = model.Base.qry(model.FellowTraveler,**kwargs)
        if name:
            qry = qry.filter(cls.name==name)
        if added_by:
            qry = qry.filter(cls.added_by==added_by)
        return qry



