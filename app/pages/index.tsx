import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { getMiniForDate } from '../lib/dailyMinis';
import { Link } from '../components/Link';
import { puzzleFromDB } from '../lib/types';
import { AdminApp } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';
import {
  toLinkablePuzzle,
  LinkablePuzzle,
  PuzzleResultLink,
} from '../components/PuzzleLink';
import { userIdToPage } from '../lib/serverOnly';
import { PAGE_SIZE } from './featured/[pageNumber]';
import { useContext } from 'react';
import { AuthContext } from '../components/AuthContext';
import { ContactLinks } from '../components/ContactLinks';
import { CreateShareSection } from '../components/CreateShareSection';
import { SMALL_AND_UP } from '../lib/style';
import { UnfinishedPuzzleList } from '../components/UnfinishedPuzzleList';
import { ArticleT, validate } from '../lib/article';
import { Trans, t } from '@lingui/macro';
import { withTranslation } from '../lib/translation';
import { ConstructorPageT } from '../lib/constructorPage';
import { I18nTags } from '../components/I18nTags';
import { useRouter } from 'next/router';
import { paginatedPuzzles } from '../lib/paginatedPuzzles';
import { isUserPatron } from '../lib/patron';
import { isSome } from 'fp-ts/lib/Option';
import { PatronIcon } from '../components/Icons';

type HomepagePuz = LinkablePuzzle & {
  constructorPage: ConstructorPageT | null;
  constructorIsPatron: boolean;
};

interface HomePageProps {
  dailymini: HomepagePuz | null;
  featured: Array<HomepagePuz>;
  articles: Array<ArticleT>;
}

const gssp: GetServerSideProps<HomePageProps> = async ({ res }) => {
  const db = AdminApp.firestore();
  const todaysMini = await getMiniForDate(db, new Date());

  const unfilteredArticles = await db
    .collection('a')
    .where('f', '==', true)
    .get()
    .then((articlesResult) => {
      return articlesResult.docs.map((d) => validate(d.data()));
    });

  const articles: ArticleT[] = unfilteredArticles.filter((i): i is ArticleT => {
    return i !== null;
  });

  const [puzzlesWithoutConstructor] = await paginatedPuzzles(
    0,
    PAGE_SIZE,
    'f',
    true
  );
  const featured = await Promise.all(
    puzzlesWithoutConstructor.map(async (p) => ({
      ...p,
      constructorPage: await userIdToPage(p.authorId),
      constructorIsPatron: await isUserPatron(p.authorId),
    }))
  );

  if (isSome(todaysMini)) {
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    const dm: HomepagePuz = {
      ...toLinkablePuzzle({
        ...puzzleFromDB(todaysMini.value),
        id: todaysMini.value.id,
      }),
      constructorPage: await userIdToPage(todaysMini.value.a),
      constructorIsPatron: await isUserPatron(todaysMini.value.a),
    };
    return {
      props: { dailymini: dm, featured, articles },
    };
  }
  return { props: { dailymini: null, featured, articles } };
};

export const getServerSideProps = withTranslation(gssp);

const ArticleListItem = (props: ArticleT) => {
  return (
    <li key={props.s}>
      <Link href={`/articles/${props.s}`}>{props.t}</Link>
    </li>
  );
};

export default function HomePage({
  dailymini,
  featured,
  articles,
}: HomePageProps) {
  const today = new Date();
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const title = t({
    id: 'home-title',
    message:
      'Crosshare - Free Crossword Constructor and Daily Mini Crossword Puzzles',
  });
  return (
    <>
      <Head>
        <title>{title}</title>
        <I18nTags locale={router.locale || 'en'} canonicalPath="/" />
      </Head>

      <DefaultTopBar />

      <div css={{ margin: '1em' }}>
        <Link
          css={{
            display: 'block',
            textDecoration: 'none',
            color: 'var(--text)',
            border: '1px solid var(--error)',
            borderRadius: '0.5em',
            padding: '1em',
            marginBottom: '1em',
            '&:hover': {
              color: 'var(--text)',
              textDecoration: 'none',
            },
          }}
          href="/donate"
        >
          <h3>
            <span css={{ color: 'var(--error)' }}>Read this</span> - we need
            your help!
          </h3>
          <div>
            As Crosshare continues to grow (and add new features) I need help to
            pay for the ongoing costs of running the site. This holiday season /
            new year, I&apos;m hoping to reach $100/month in new recurring
            donations to keep the site going through 2022 and beyond. Please
            consider contributing whatever you are able - think of it like a
            Netflix subscription, but instead of helping a huge faceless
            multinational provide mindless entertainment you&apos;re helping a
            volunteer team of one provide mindful entertainment 😂. All monthly
            contributers get a new patron icon - <PatronIcon /> - so we all know
            who to thank for making the site possible!
          </div>
        </Link>
        <p css={{ marginBottom: '1em' }}>
          <Trans id="crosshare-intro">
            Crosshare is a <b>free</b>, <b>ad-free</b>, and{' '}
            <a href="https://github.com/mdirolf/crosshare/">open-source</a>{' '}
            place to create, share and solve crossword puzzles.
          </Trans>
        </p>
        <p>
          <Trans id="consider-donating">
            If you&apos;re enjoying Crosshare please consider{' '}
            <Link href="/donate">donating</Link> to support its continuing
            development.
          </Trans>
        </p>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            [SMALL_AND_UP]: {
              flexDirection: 'row',
            },
          }}
        >
          {dailymini ? (
            <div css={{ flex: '50%' }}>
              <h2>
                <Trans>Daily Mini</Trans>
              </h2>
              <PuzzleResultLink
                fullWidth
                puzzle={dailymini}
                showAuthor={true}
                constructorPage={dailymini.constructorPage}
                constructorIsPatron={dailymini.constructorIsPatron}
                title={t`Today's daily mini crossword`}
              />
              <p>
                <Link
                  href={`/dailyminis/${today.getUTCFullYear()}/${
                    today.getUTCMonth() + 1
                  }`}
                >
                  <Trans>Previous daily minis</Trans> &rarr;
                </Link>
              </p>
            </div>
          ) : (
            ''
          )}
          <div css={{ flex: '50%' }}>
            <CreateShareSection halfWidth={true} />
          </div>
        </div>
        <hr css={{ margin: '2em 0' }} />
        <h2 css={{ marginBottom: 0 }}>
          <Trans>Featured Puzzles</Trans>
        </h2>
        <div css={{ marginBottom: '1.5em' }}>
          <Link href="/newest">
            <Trans>View all puzzles</Trans> &rarr;
          </Link>
        </div>
        {featured.map((p, i) => (
          <PuzzleResultLink
            key={i}
            puzzle={p}
            showDate={true}
            constructorPage={p.constructorPage}
            showAuthor={true}
            constructorIsPatron={p.constructorIsPatron}
          />
        ))}
        <p>
          <Link href="/featured/1">
            <Trans>Previous featured puzzles</Trans> &rarr;
          </Link>
        </p>
        <hr css={{ margin: '2em 0' }} />
        <UnfinishedPuzzleList user={user} />
        <h4 css={{ marginTop: '2em' }}>
          <Trans id="faq">Frequently asked questions and information</Trans>
        </h4>
        <ul
          css={{
            listStyleType: 'none',
            padding: 0,
            margin: 0,
            columnWidth: '30em',
          }}
        >
          {articles.map(ArticleListItem)}
        </ul>
        <p css={{ marginTop: '1em', textAlign: 'center' }}>
          <Trans
            id="questions"
            comment="the variable is a translated version of 'email or twitter'"
          >
            If you have questions or suggestions please contact us via{' '}
            <ContactLinks />.
          </Trans>
        </p>
      </div>
    </>
  );
}
