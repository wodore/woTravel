# coding: utf-8
from __future__ import absolute_import
from google.appengine.ext import ndb
import model
import auth

class expense_types(object):
    @classmethod
    def basic(cls):
        types = []

        if not model.ExpenseType.qry(name="misc").get():
            types.append(model.ExpenseType(
                    name="misc",
                    description="Anything else.",
                    icon_url="",
                    icon_name="help-circle",
                    added_by=auth.current_user_key(),
                    default=True
                    )
                )

        if not model.ExpenseType.qry(name="food").get():
            types.append(model.ExpenseType(
                    name="food",
                    description="",
                    icon_url="",
                    icon_name="food",
                    added_by=auth.current_user_key(),
                    )
                )

        if not model.ExpenseType.qry(name="transport").get():
            types.append(model.ExpenseType(
                    name="transport",
                    description="Local transport.",
                    icon_url="",
                    icon_name="train",
                    added_by=auth.current_user_key(),
                    )
                )

        if not model.ExpenseType.qry(name="transport to").get():
            types.append(model.ExpenseType(
                    name="transport to",
                    description="Transport to the trip form home.",
                    icon_url="",
                    icon_name="airplane-landing",
                    added_by=auth.current_user_key(),
                    )
                )

        if not model.ExpenseType.qry(name="transport from").get():
            types.append(model.ExpenseType(
                    name="transport from",
                    description="Transport from the trip to home.",
                    icon_url="",
                    icon_name="airplane-takeoff",
                    added_by=auth.current_user_key(),
                    )
                )

        if not model.ExpenseType.qry(name="accomodation").get():
            types.append(model.ExpenseType(
                    name="accomodation",
                    description="",
                    icon_url="",
                    icon_name="hotel",
                    added_by=auth.current_user_key(),
                    )
                )

        if not model.ExpenseType.qry(name="activities").get():
            types.append(model.ExpenseType(
                    name="activities",
                    description="All kind of activities (eg. museum, sport game, ...).",
                    icon_url="",
                    icon_name="bank",
                    added_by=auth.current_user_key(),
                    )
                )


        return ndb.put_multi(types)

